'use strict';

class VideoDrawingOverlay {
    static overlays = new Map();
    static onEmitDrawing = null;
    static getLocalDrawerId = null;
    static resolveDrawerName = null;
    static AUTO_CLEAR_MS = 5000;
    static SYNC_INTERVAL_MS = 50;
    static BRUSH_COLOR = 'rgba(255, 255, 0, 0.85)';

    constructor(screenOwnerId, screenWrap, video) {
        this.screenOwnerId = screenOwnerId;
        this.screenWrap = screenWrap;
        this.video = video;
        this.isActive = false;
        this.isDrawing = false;
        this.strokes = [];
        this.pendingPoints = [];
        this.clearTimers = new Map();
        this.remoteStrokes = new Map();

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'video-drawing-canvas';
        this.canvas.setAttribute('aria-label', 'Screen annotation canvas');
        this.context = this.canvas.getContext('2d');
        screenWrap.appendChild(this.canvas);

        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        this.canvas.addEventListener('pointerdown', this.handlePointerDown);
        this.canvas.addEventListener('pointermove', this.handlePointerMove);
        this.canvas.addEventListener('pointerup', this.handlePointerUp);
        this.canvas.addEventListener('pointercancel', this.handlePointerUp);

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(screenWrap);
        video.addEventListener('loadedmetadata', () => this.resize(), { once: true });
        this.resize();
        VideoDrawingOverlay.overlays.set(screenOwnerId, this);
    }

    resize() {
        const wrapRect = this.screenWrap.getBoundingClientRect();
        const videoRect = this.video.getBoundingClientRect();
        const videoWidth = this.video.videoWidth || videoRect.width;
        const videoHeight = this.video.videoHeight || videoRect.height;
        if (!wrapRect.width || !wrapRect.height || !videoWidth || !videoHeight) return;

        const scale = Math.min(videoRect.width / videoWidth, videoRect.height / videoHeight);
        const width = videoWidth * scale;
        const height = videoHeight * scale;
        this.canvas.style.left = `${videoRect.left - wrapRect.left + (videoRect.width - width) / 2}px`;
        this.canvas.style.top = `${videoRect.top - wrapRect.top + (videoRect.height - height) / 2}px`;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;

        const pixelRatio = window.devicePixelRatio || 1;
        this.canvas.width = Math.max(1, Math.round(width * pixelRatio));
        this.canvas.height = Math.max(1, Math.round(height * pixelRatio));
        this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        this.render();
    }

    toggle(button) {
        this.isActive = !this.isActive;
        this.canvas.classList.toggle('video-drawing-active', this.isActive);
        button?.classList.toggle('video-drawing-pen-active', this.isActive);
        button?.setAttribute('aria-pressed', String(this.isActive));
        const label = this.isActive ? 'Disable screen drawing' : 'Enable screen drawing';
        const translatedLabel = window.i18n?.t(label, 'tooltips') || label;
        if (button) {
            button['__i18nAttr_aria-label'] = label;
            button.setAttribute('aria-label', translatedLabel);
        }
        if (button?._tippy) {
            button._tippy.__i18nSrc = label;
            button._tippy.setContent(translatedLabel);
        }
        return this.isActive;
    }

    handlePointerDown(event) {
        if (!this.isActive || event.button > 0) return;
        event.preventDefault();
        this.canvas.setPointerCapture(event.pointerId);
        this.isDrawing = true;
        const stroke = {
            drawerId: VideoDrawingOverlay.getLocalDrawerId?.(),
            color: VideoDrawingOverlay.BRUSH_COLOR,
            width: 0.004,
            points: [this.getPoint(event)],
        };
        this.strokes.push(stroke);
        this.activeStroke = stroke;
        this.pendingPoints = [...stroke.points];
        this.render();
        this.scheduleSync(false);
    }

    handlePointerMove(event) {
        if (!this.isDrawing || !this.activeStroke) return;
        event.preventDefault();
        const point = this.getPoint(event);
        this.activeStroke.points.push(point);
        this.pendingPoints.push(point);
        this.render();
        this.scheduleSync(false);
    }

    handlePointerUp(event) {
        if (!this.isDrawing) return;
        event.preventDefault();
        this.isDrawing = false;
        this.scheduleClear(this.activeStroke);
        this.scheduleSync(true);
        this.activeStroke = null;
    }

    getPoint(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
            y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
        };
    }

    scheduleSync(end) {
        this.pendingEnd = this.pendingEnd || end;
        if (end) {
            this.flushSync();
            return;
        }
        if (this.syncTimer) return;
        this.syncTimer = setTimeout(() => this.flushSync(), VideoDrawingOverlay.SYNC_INTERVAL_MS);
    }

    flushSync() {
        clearTimeout(this.syncTimer);
        this.syncTimer = null;
        if (!this.pendingPoints.length) return;
        const points = this.pendingPoints.splice(0).map(({ x, y }) => ({
            x: Number(x.toFixed(4)),
            y: Number(y.toFixed(4)),
        }));
        const data = { screenOwnerId: this.screenOwnerId, points, end: Boolean(this.pendingEnd) };
        this.pendingEnd = false;
        VideoDrawingOverlay.onEmitDrawing?.(data);
    }

    addRemotePoints(drawerId, points, end) {
        if (!Array.isArray(points) || !points.length) return;
        const strokeKey = drawerId || 'remote';
        let stroke = this.remoteStrokes.get(strokeKey);
        if (!stroke) {
            stroke = { drawerId, color: VideoDrawingOverlay.BRUSH_COLOR, width: 0.004, points: [] };
            this.remoteStrokes.set(strokeKey, stroke);
            this.strokes.push(stroke);
        }
        stroke.points.push(...points);
        this.scheduleClear(stroke);
        if (end) {
            this.remoteStrokes.delete(strokeKey);
        }
        this.render();
    }

    scheduleClear(stroke) {
        clearTimeout(this.clearTimers.get(stroke));
        const timer = setTimeout(() => {
            this.strokes = this.strokes.filter((item) => item !== stroke);
            const strokeKey = stroke.drawerId || 'remote';
            if (this.remoteStrokes.get(strokeKey) === stroke) this.remoteStrokes.delete(strokeKey);
            this.clearTimers.delete(stroke);
            this.render();
        }, VideoDrawingOverlay.AUTO_CLEAR_MS);
        this.clearTimers.set(stroke, timer);
    }

    render() {
        const rect = this.canvas.getBoundingClientRect();
        this.context.clearRect(0, 0, rect.width, rect.height);
        const latestStrokesByDrawer = new Map();
        for (const stroke of this.strokes) {
            if (!stroke.points.length) continue;
            this.context.beginPath();
            this.context.strokeStyle = stroke.color;
            this.context.lineWidth = Math.max(2, stroke.width * rect.width);
            this.context.lineCap = 'round';
            this.context.lineJoin = 'round';
            this.context.moveTo(stroke.points[0].x * rect.width, stroke.points[0].y * rect.height);
            for (const point of stroke.points.slice(1)) {
                this.context.lineTo(point.x * rect.width, point.y * rect.height);
            }
            this.context.stroke();
            latestStrokesByDrawer.set(stroke.drawerId || 'remote', stroke);
        }
        for (const stroke of latestStrokesByDrawer.values()) {
            this.renderDrawerName(stroke, rect);
        }
    }

    renderDrawerName(stroke, rect) {
        const drawerName = String(VideoDrawingOverlay.resolveDrawerName?.(stroke.drawerId) || 'Participant').trim();
        const point = stroke.points.at(-1);
        if (!drawerName || !point) return;

        const paddingX = 6;
        const labelHeight = 22;
        const maxTextWidth = Math.min(160, Math.max(40, rect.width - paddingX * 2));
        const fontFamily = getComputedStyle(this.screenWrap).fontFamily || 'sans-serif';
        this.context.save();
        this.context.font = `600 12px ${fontFamily}`;
        this.context.textBaseline = 'middle';

        let label = drawerName;
        while (label.length > 1 && this.context.measureText(label).width > maxTextWidth) {
            label = `${label.slice(0, -4)}...`;
        }

        const labelWidth = Math.min(maxTextWidth, this.context.measureText(label).width) + paddingX * 2;
        const pointX = point.x * rect.width;
        const pointY = point.y * rect.height;
        let labelX = pointX + 10;
        if (labelX + labelWidth > rect.width) labelX = pointX - labelWidth - 10;
        labelX = Math.max(0, Math.min(rect.width - labelWidth, labelX));

        let labelY = pointY - labelHeight - 10;
        if (labelY < 0) labelY = pointY + 10;
        labelY = Math.max(0, Math.min(rect.height - labelHeight, labelY));

        this.context.fillStyle = 'rgba(0, 0, 0, 0.78)';
        this.context.fillRect(labelX, labelY, labelWidth, labelHeight);
        this.context.fillStyle = '#fff';
        this.context.fillText(label, labelX + paddingX, labelY + labelHeight / 2, maxTextWidth);
        this.context.restore();
    }

    destroy() {
        clearTimeout(this.syncTimer);
        for (const timer of this.clearTimers.values()) clearTimeout(timer);
        this.resizeObserver.disconnect();
        this.canvas.remove();
        VideoDrawingOverlay.overlays.delete(this.screenOwnerId);
    }

    static getOrCreate(screenOwnerId, screenWrap, video) {
        return this.overlays.get(screenOwnerId) || new VideoDrawingOverlay(screenOwnerId, screenWrap, video);
    }

    static receive(data) {
        const overlay = data && this.overlays.get(data.screenOwnerId);
        overlay?.addRemotePoints(data.drawerId, data.points, data.end);
    }

    static destroyById(screenOwnerId) {
        this.overlays.get(screenOwnerId)?.destroy();
    }
}
