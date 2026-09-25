'use strict';

class VideoDrawingOverlay {
    static overlays = new Map();
    static pendingTextEvents = new Map();
    static pendingAnnotationEvents = new Map();
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
        this.isToolbarCollapsed = false;
        this.tool = null;
        this.isDrawing = false;
        this.strokes = [];
        this.annotations = new Map();
        this.pendingPoints = [];
        this.clearTimers = new Map();
        this.drawerNameTimers = new Map();
        this.remoteStrokes = new Map();
        this.textAnnotations = new Map();

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
        for (const data of VideoDrawingOverlay.pendingTextEvents.get(screenOwnerId) || []) this.receiveText(data);
        VideoDrawingOverlay.pendingTextEvents.delete(screenOwnerId);
        for (const data of VideoDrawingOverlay.pendingAnnotationEvents.get(screenOwnerId) || []) {
            this.receiveAnnotation(data);
        }
        VideoDrawingOverlay.pendingAnnotationEvents.delete(screenOwnerId);
    }

    resize() {
        const wrapRect = this.screenWrap.getBoundingClientRect();
        const videoRect = this.video.getBoundingClientRect();
        const videoWidth = this.video.videoWidth || videoRect.width;
        const videoHeight = this.video.videoHeight || videoRect.height;
        if (!wrapRect.width || !wrapRect.height || !videoWidth || !videoHeight) return;

        const wrapScaleX = this.screenWrap.offsetWidth ? wrapRect.width / this.screenWrap.offsetWidth : 1;
        const wrapScaleY = this.screenWrap.offsetHeight ? wrapRect.height / this.screenWrap.offsetHeight : 1;
        const localVideoWidth = videoRect.width / wrapScaleX;
        const localVideoHeight = videoRect.height / wrapScaleY;
        const scale = Math.min(localVideoWidth / videoWidth, localVideoHeight / videoHeight);
        const width = videoWidth * scale;
        const height = videoHeight * scale;
        const videoLeft = (videoRect.left - wrapRect.left) / wrapScaleX - this.screenWrap.clientLeft;
        const videoTop = (videoRect.top - wrapRect.top) / wrapScaleY - this.screenWrap.clientTop;
        this.canvas.style.left = `${videoLeft + (localVideoWidth - width) / 2}px`;
        this.canvas.style.top = `${videoTop + (localVideoHeight - height) / 2}px`;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;

        const pixelRatio = window.devicePixelRatio || 1;
        this.canvas.width = Math.max(1, Math.round(width * pixelRatio));
        this.canvas.height = Math.max(1, Math.round(height * pixelRatio));
        this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        this.positionTextAnnotations();
        this.render();
    }

    bindControls(drawingButton, textButton) {
        this.drawingButton = drawingButton;
        this.textButton = textButton;
        this.color = '#ffeb3b';
        this.lastDrawingTool = 'pencil';

        const toolbar = document.createElement('div');
        toolbar.className = 'video-drawing-toolbar';
        toolbar.setAttribute('aria-label', 'Screen annotation tools');

        const dragHandle = document.createElement('button');
        dragHandle.type = 'button';
        dragHandle.className = 'video-drawing-drag-handle fas fa-arrows-alt';
        dragHandle.setAttribute('aria-label', 'Move annotation toolbar');
        toolbar.appendChild(dragHandle);

        const tools = [
            ['pencil', 'fas fa-pencil-alt', 'Pencil'],
            ['highlighter', 'fas fa-highlighter', 'Highlighter'],
            ['vanishing', 'fas fa-wand-magic-sparkles', 'Vanishing pen'],
            ['circle', 'far fa-circle', 'Circle'],
            ['select', 'fas fa-mouse-pointer', 'Select and move'],
        ];
        this.toolButtons = {};
        for (const [tool, icon, label] of tools) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = icon;
            button.setAttribute('aria-label', label);
            button.setAttribute('aria-pressed', 'false');
            button.addEventListener('click', () => {
                this.lastDrawingTool = tool;
                this.setTool(tool);
            });
            toolbar.appendChild(button);
            this.toolButtons[tool] = button;
        }

        const color = document.createElement('input');
        color.type = 'color';
        color.value = this.color;
        color.className = 'video-drawing-color';
        color.setAttribute('aria-label', 'Annotation color');
        color.addEventListener('input', () => {
            this.color = color.value;
        });
        toolbar.appendChild(color);

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'video-drawing-delete fas fa-trash-alt';
        deleteButton.setAttribute('aria-label', 'Delete selected annotation');
        deleteButton.disabled = true;
        deleteButton.addEventListener('click', () => this.deleteSelectedAnnotation());
        toolbar.appendChild(deleteButton);
        this.deleteButton = deleteButton;

        const clearButton = document.createElement('button');
        clearButton.type = 'button';
        clearButton.className = 'fas fa-eraser';
        const clearLabel =
            VideoDrawingOverlay.getLocalDrawerId?.() === this.screenOwnerId
                ? 'Clear screen annotations'
                : 'Clear my screen annotations';
        clearButton.setAttribute('aria-label', clearLabel);
        clearButton.addEventListener('click', () => this.clearAnnotations(true));
        toolbar.appendChild(clearButton);

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'video-drawing-close fas fa-times';
        closeButton.setAttribute('aria-label', 'Hide annotation toolbar');
        closeButton.addEventListener('click', () => this.setToolbarCollapsed(true));
        toolbar.appendChild(closeButton);

        this.toolbar = toolbar;
        this.screenWrap.appendChild(toolbar);
        if (typeof setTippy === 'function') {
            for (const [element, label] of [
                [dragHandle, 'Move annotation toolbar'],
                ...tools.map(([tool, , label]) => [this.toolButtons[tool], label]),
                [color, 'Annotation color'],
                [deleteButton, 'Delete selected annotation'],
                [clearButton, clearLabel],
                [closeButton, 'Hide annotation toolbar'],
            ]) {
                setTippy(element, label, 'bottom');
            }
        }
        if (!isMobileDevice && typeof dragElement === 'function') dragElement(toolbar, dragHandle);

        drawingButton.addEventListener('click', () => {
            const isDrawingTool = this.isActive && this.tool !== 'text';
            if (isDrawingTool && this.isToolbarCollapsed) this.setToolbarCollapsed(false);
            const tool = isDrawingTool ? null : this.lastDrawingTool;
            this.setTool(tool);
        });
        textButton.addEventListener('click', () => this.setTool(this.isActive && this.tool === 'text' ? null : 'text'));
    }

    setToolbarCollapsed(collapsed) {
        this.isToolbarCollapsed = collapsed;
        this.toolbar.classList.toggle('video-drawing-toolbar-collapsed', collapsed);
        this.updateModeButtons();
    }

    updateModeButtons() {
        const isDrawingTool = this.isActive && this.tool !== 'text';
        for (const [button, selected, label] of [
            [this.drawingButton, isDrawingTool, 'screen drawing'],
            [this.textButton, this.isActive && this.tool === 'text', 'screen text'],
        ]) {
            button.classList.toggle('video-drawing-tool-active', selected);
            button.setAttribute('aria-pressed', String(selected));
            const accessibleLabel = `${selected ? 'Disable' : 'Enable'} ${label}`;
            const translatedLabel = window.i18n?.t(accessibleLabel, 'tooltips') || accessibleLabel;
            button['__i18nAttr_aria-label'] = accessibleLabel;
            button.setAttribute('aria-label', translatedLabel);
            if (button._tippy) {
                button._tippy.__i18nSrc = accessibleLabel;
                button._tippy.setContent(translatedLabel);
            }
        }
    }

    setTool(tool) {
        this.isActive = Boolean(tool);
        this.tool = tool;
        const isDrawingTool = this.isActive && tool !== 'text';
        this.canvas.classList.toggle('video-drawing-active', this.isActive);
        this.canvas.classList.toggle('video-drawing-selecting', tool === 'select');
        this.toolbar.classList.toggle('video-drawing-toolbar-active', isDrawingTool);
        for (const [buttonTool, button] of Object.entries(this.toolButtons)) {
            const selected = isDrawingTool && buttonTool === tool;
            button.classList.toggle('video-drawing-tool-active', selected);
            button.setAttribute('aria-pressed', String(selected));
        }
        this.updateModeButtons();
        if (tool !== 'select') this.selectAnnotation(null);
        if (tool !== 'text') this.textInput?.remove();
    }

    handlePointerDown(event) {
        if (!this.isActive || event.button > 0) return;
        event.preventDefault();
        if (this.tool === 'text') {
            this.beginTextInput(event);
            return;
        }
        if (this.tool === 'select') {
            const point = this.getPoint(event);
            const annotation = this.findCircleAtPoint(point);
            this.selectAnnotation(annotation?.annotationId || null);
            if (!annotation || !this.canManageAnnotation(annotation)) return;
            this.canvas.setPointerCapture(event.pointerId);
            this.isDrawing = true;
            annotation.showDrawerName = true;
            this.draggedAnnotation = {
                annotation,
                start: point,
                originalPoints: annotation.points.map(({ x, y }) => ({ x, y })),
            };
            return;
        }
        this.canvas.setPointerCapture(event.pointerId);
        this.isDrawing = true;
        if (['pencil', 'highlighter', 'circle'].includes(this.tool)) {
            const point = this.getPoint(event);
            const annotation = {
                annotationId: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                drawerId: VideoDrawingOverlay.getLocalDrawerId?.(),
                tool: this.tool,
                color: this.color,
                width: this.tool === 'highlighter' ? 0.018 : 0.004,
                points: [point, point],
                showDrawerName: true,
            };
            this.annotations.set(annotation.annotationId, annotation);
            this.activeAnnotation = annotation;
            this.render();
            return;
        }
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
        if (!this.isDrawing) return;
        event.preventDefault();
        const point = this.getPoint(event);
        if (this.draggedAnnotation) {
            const { annotation, start, originalPoints } = this.draggedAnnotation;
            const requestedX = point.x - start.x;
            const requestedY = point.y - start.y;
            const minX = Math.min(...originalPoints.map(({ x }) => x));
            const maxX = Math.max(...originalPoints.map(({ x }) => x));
            const minY = Math.min(...originalPoints.map(({ y }) => y));
            const maxY = Math.max(...originalPoints.map(({ y }) => y));
            const offsetX = Math.max(-minX, Math.min(1 - maxX, requestedX));
            const offsetY = Math.max(-minY, Math.min(1 - maxY, requestedY));
            annotation.points = originalPoints.map(({ x, y }) => ({ x: x + offsetX, y: y + offsetY }));
            this.render();
            return;
        }
        if (this.activeAnnotation) {
            if (this.activeAnnotation.tool === 'circle') {
                this.activeAnnotation.points[1] = point;
            } else if (this.activeAnnotation.points.length < 2048) {
                this.activeAnnotation.points.push(point);
            }
            this.render();
            return;
        }
        if (!this.activeStroke) return;
        this.activeStroke.points.push(point);
        this.pendingPoints.push(point);
        this.render();
        this.scheduleSync(false);
    }

    handlePointerUp(event) {
        if (!this.isDrawing) return;
        event.preventDefault();
        this.isDrawing = false;
        if (this.draggedAnnotation) {
            const { annotation } = this.draggedAnnotation;
            this.draggedAnnotation = null;
            this.scheduleDrawerNameClear(annotation);
            VideoDrawingOverlay.onEmitDrawing?.({
                type: 'annotation',
                action: 'move',
                screenOwnerId: this.screenOwnerId,
                annotationId: annotation.annotationId,
                points: annotation.points.map(({ x, y }) => ({
                    x: Number(x.toFixed(4)),
                    y: Number(y.toFixed(4)),
                })),
            });
            return;
        }
        if (this.activeAnnotation) {
            const annotation = this.activeAnnotation;
            this.activeAnnotation = null;
            this.scheduleDrawerNameClear(annotation);
            VideoDrawingOverlay.onEmitDrawing?.({
                type: 'annotation',
                action: 'create',
                screenOwnerId: this.screenOwnerId,
                annotationId: annotation.annotationId,
                tool: annotation.tool,
                color: annotation.color,
                width: annotation.width,
                points: annotation.points.map(({ x, y }) => ({
                    x: Number(x.toFixed(4)),
                    y: Number(y.toFixed(4)),
                })),
            });
            return;
        }
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

    beginTextInput(event) {
        this.textInput?.remove();
        const point = this.getPoint(event);
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = 80;
        input.className = 'video-drawing-text-input';
        const placeholder = 'Type annotation';
        const ariaLabel = 'Screen text annotation';
        input['__i18nAttr_placeholder'] = placeholder;
        input['__i18nAttr_aria-label'] = ariaLabel;
        input.placeholder = window.i18n?.t(placeholder, 'labels') || placeholder;
        input.setAttribute('aria-label', window.i18n?.t(ariaLabel, 'labels') || ariaLabel);
        const canvasWidth = this.canvas.clientWidth;
        const canvasHeight = this.canvas.clientHeight;
        const inputWidth = Math.min(240, Math.max(40, canvasWidth - 16));
        const inputLeft = Math.min(point.x * canvasWidth, canvasWidth - inputWidth - 8);
        const inputTop = Math.min(point.y * canvasHeight, canvasHeight - 42);
        input.style.left = `${this.canvas.offsetLeft + Math.max(8, inputLeft)}px`;
        input.style.top = `${this.canvas.offsetTop + Math.max(8, inputTop)}px`;
        input.style.width = `${inputWidth}px`;
        this.screenWrap.appendChild(input);
        this.textInput = input;

        let finished = false;
        const finish = (commit) => {
            if (finished) return;
            finished = true;
            const text = input.value.trim();
            input.remove();
            if (this.textInput === input) this.textInput = null;
            if (!commit || !text) return;

            const annotation = {
                type: 'text',
                annotationId: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                drawerId: VideoDrawingOverlay.getLocalDrawerId?.(),
                text,
                ...point,
            };
            this.addTextAnnotation(annotation);
            VideoDrawingOverlay.onEmitDrawing?.({
                type: 'text',
                action: 'create',
                screenOwnerId: this.screenOwnerId,
                annotationId: annotation.annotationId,
                text,
                x: Number(point.x.toFixed(4)),
                y: Number(point.y.toFixed(4)),
            });
        };

        input.addEventListener('keydown', (inputEvent) => {
            if (inputEvent.key === 'Enter') finish(true);
            if (inputEvent.key === 'Escape') finish(false);
            inputEvent.stopPropagation();
        });
        input.addEventListener('blur', () => finish(true));
        input.focus();
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
        const data = { type: 'pen', screenOwnerId: this.screenOwnerId, points, end: Boolean(this.pendingEnd) };
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

    addTextAnnotation(annotation) {
        if (!annotation.annotationId || this.textAnnotations.has(annotation.annotationId)) return;
        const element = document.createElement('div');
        element.className = 'video-drawing-text-annotation';
        element.setAttribute('role', 'note');
        element.tabIndex = 0;

        const drawerName = String(VideoDrawingOverlay.resolveDrawerName?.(annotation.drawerId) || 'Participant').trim();

        const text = document.createElement('span');
        text.className = 'video-drawing-text-content';
        text.textContent = annotation.text;
        element.appendChild(text);

        const author = document.createElement('span');
        author.className = 'video-drawing-text-author';
        const authorLabel = 'Annotated by';
        const authorLabelNode = document.createTextNode(window.i18n?.t(authorLabel, 'labels') || authorLabel);
        authorLabelNode.__i18nSrc = authorLabel;
        author.append(authorLabelNode, document.createTextNode(` ${drawerName}`));
        element.appendChild(author);

        annotation.element = element;
        this.textAnnotations.set(annotation.annotationId, annotation);
        this.screenWrap.appendChild(element);

        if (this.canManageTextAnnotation(annotation)) {
            element.classList.add('video-drawing-text-manageable');
            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'video-drawing-text-delete fas fa-times';
            const deleteLabel = 'Delete text annotation';
            deleteButton['__i18nAttr_aria-label'] = deleteLabel;
            deleteButton.setAttribute('aria-label', window.i18n?.t(deleteLabel, 'buttons') || deleteLabel);
            deleteButton.addEventListener('click', (event) => {
                event.stopPropagation();
                this.deleteTextAnnotation(annotation.annotationId);
                VideoDrawingOverlay.onEmitDrawing?.({
                    type: 'text',
                    action: 'delete',
                    screenOwnerId: this.screenOwnerId,
                    annotationId: annotation.annotationId,
                });
            });
            element.appendChild(deleteButton);
            this.bindTextDrag(annotation);
        }

        this.positionTextAnnotation(annotation);
    }

    canManageTextAnnotation(annotation) {
        const localDrawerId = VideoDrawingOverlay.getLocalDrawerId?.();
        return localDrawerId === annotation.drawerId || localDrawerId === this.screenOwnerId;
    }

    bindTextDrag(annotation) {
        const { element } = annotation;
        let drag = null;
        element.addEventListener('pointerdown', (event) => {
            if (event.target.closest('button') || event.button > 0) return;
            event.preventDefault();
            element.focus({ preventScroll: true });
            const rect = element.getBoundingClientRect();
            drag = {
                pointerId: event.pointerId,
                offsetX: event.clientX - rect.left,
                offsetY: event.clientY - rect.top,
            };
            element.setPointerCapture(event.pointerId);
            element.classList.add('video-drawing-text-dragging');
        });
        element.addEventListener('pointermove', (event) => {
            if (!drag || drag.pointerId !== event.pointerId) return;
            const canvasRect = this.canvas.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const maxX = Math.max(0, 1 - elementRect.width / canvasRect.width);
            const maxY = Math.max(0, 1 - elementRect.height / canvasRect.height);
            annotation.x = Math.max(
                0,
                Math.min(maxX, (event.clientX - drag.offsetX - canvasRect.left) / canvasRect.width)
            );
            annotation.y = Math.max(
                0,
                Math.min(maxY, (event.clientY - drag.offsetY - canvasRect.top) / canvasRect.height)
            );
            this.positionTextAnnotation(annotation);
        });
        const finishDrag = (event) => {
            if (!drag || drag.pointerId !== event.pointerId) return;
            drag = null;
            element.classList.remove('video-drawing-text-dragging');
            VideoDrawingOverlay.onEmitDrawing?.({
                type: 'text',
                action: 'move',
                screenOwnerId: this.screenOwnerId,
                annotationId: annotation.annotationId,
                x: Number(annotation.x.toFixed(4)),
                y: Number(annotation.y.toFixed(4)),
            });
        };
        element.addEventListener('pointerup', finishDrag);
        element.addEventListener('pointercancel', finishDrag);
    }

    moveTextAnnotation(annotationId, x, y) {
        const annotation = this.textAnnotations.get(annotationId);
        if (!annotation) return;
        annotation.x = x;
        annotation.y = y;
        this.positionTextAnnotation(annotation);
    }

    deleteTextAnnotation(annotationId) {
        const annotation = this.textAnnotations.get(annotationId);
        if (!annotation) return;
        annotation.element.remove();
        this.textAnnotations.delete(annotationId);
    }

    clearTextAnnotations() {
        for (const annotation of this.textAnnotations.values()) annotation.element.remove();
        this.textAnnotations.clear();
    }

    positionTextAnnotations() {
        for (const annotation of this.textAnnotations.values()) this.positionTextAnnotation(annotation);
    }

    positionTextAnnotation(annotation) {
        const canvasWidth = this.canvas.clientWidth;
        const canvasHeight = this.canvas.clientHeight;
        const annotationScale = Math.max(0.5, Math.min(1, canvasWidth / 640, canvasHeight / 360));
        annotation.element.style.setProperty('--video-drawing-annotation-scale', annotationScale);
        annotation.element.style.maxWidth = `${Math.max(1, Math.min(280 * annotationScale, canvasWidth - 16))}px`;
        const x = Math.min(annotation.x * canvasWidth, Math.max(0, canvasWidth - annotation.element.offsetWidth));
        const y = Math.min(annotation.y * canvasHeight, Math.max(0, canvasHeight - annotation.element.offsetHeight));
        annotation.element.classList.toggle('video-drawing-text-author-below', annotation.y < 0.15);
        annotation.element.classList.toggle('video-drawing-text-author-align-right', annotation.x > 0.6);
        annotation.element.style.left = `${this.canvas.offsetLeft + x}px`;
        annotation.element.style.top = `${this.canvas.offsetTop + y}px`;
    }

    receiveText(data) {
        if (data.action === 'move') this.moveTextAnnotation(data.annotationId, data.x, data.y);
        else if (data.action === 'delete') this.deleteTextAnnotation(data.annotationId);
        else if (data.action === 'clear') this.clearTextAnnotations();
        else this.addTextAnnotation(data);
    }

    receiveAnnotation(data) {
        if (data.action === 'clear') {
            this.clearAnnotations(false, data.drawerId, Boolean(data.clearAll));
            return;
        }
        if (data.action === 'move') {
            const annotation = this.annotations.get(data.annotationId);
            if (!annotation || !Array.isArray(data.points)) return;
            annotation.points = data.points;
            annotation.showDrawerName = true;
            this.scheduleDrawerNameClear(annotation);
            this.render();
            return;
        }
        if (data.action === 'delete') {
            this.clearDrawerNameTimer(data.annotationId);
            this.annotations.delete(data.annotationId);
            if (this.selectedAnnotationId === data.annotationId) this.selectAnnotation(null);
            this.render();
            return;
        }
        if (data.action !== 'create' || !data.annotationId || this.annotations.has(data.annotationId)) return;
        data.showDrawerName = true;
        this.annotations.set(data.annotationId, data);
        this.scheduleDrawerNameClear(data);
        this.render();
    }

    canManageAnnotation(annotation) {
        const localDrawerId = VideoDrawingOverlay.getLocalDrawerId?.();
        return localDrawerId === annotation.drawerId || localDrawerId === this.screenOwnerId;
    }

    findCircleAtPoint(point) {
        const rect = { width: this.canvas.clientWidth, height: this.canvas.clientHeight };
        return [...this.annotations.values()].reverse().find((annotation) => {
            if (annotation.tool !== 'circle' || annotation.points.length < 2) return false;
            const center = annotation.points[0];
            const edge = annotation.points[1];
            const centerX = center.x * rect.width;
            const centerY = center.y * rect.height;
            const radius = Math.hypot(edge.x * rect.width - centerX, edge.y * rect.height - centerY);
            const distance = Math.hypot(point.x * rect.width - centerX, point.y * rect.height - centerY);
            return distance <= radius + Math.max(10, annotation.width * rect.width);
        });
    }

    selectAnnotation(annotationId) {
        this.selectedAnnotationId = annotationId;
        const annotation = annotationId ? this.annotations.get(annotationId) : null;
        if (this.deleteButton) this.deleteButton.disabled = !annotation || !this.canManageAnnotation(annotation);
        this.render();
    }

    deleteSelectedAnnotation() {
        const annotation = this.annotations.get(this.selectedAnnotationId);
        if (!annotation || !this.canManageAnnotation(annotation)) return;
        this.clearDrawerNameTimer(annotation.annotationId);
        this.annotations.delete(annotation.annotationId);
        this.selectAnnotation(null);
        VideoDrawingOverlay.onEmitDrawing?.({
            type: 'annotation',
            action: 'delete',
            screenOwnerId: this.screenOwnerId,
            annotationId: annotation.annotationId,
        });
    }

    clearAnnotations(emit, drawerId, forceClearAll = false) {
        const localDrawerId = VideoDrawingOverlay.getLocalDrawerId?.();
        const clearAll = forceClearAll || (emit && localDrawerId === this.screenOwnerId);
        const targetDrawerId = drawerId || localDrawerId;
        for (const [annotationId, annotation] of this.annotations) {
            if (clearAll || annotation.drawerId === targetDrawerId) {
                this.clearDrawerNameTimer(annotationId);
                this.annotations.delete(annotationId);
            }
        }
        if (!this.annotations.has(this.selectedAnnotationId)) this.selectAnnotation(null);
        this.render();
        if (emit) {
            VideoDrawingOverlay.onEmitDrawing?.({
                type: 'annotation',
                action: 'clear',
                screenOwnerId: this.screenOwnerId,
            });
        }
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

    scheduleDrawerNameClear(annotation) {
        this.clearDrawerNameTimer(annotation.annotationId);
        annotation.showDrawerName = true;
        const timer = setTimeout(() => {
            annotation.showDrawerName = false;
            this.drawerNameTimers.delete(annotation.annotationId);
            this.render();
        }, VideoDrawingOverlay.AUTO_CLEAR_MS);
        this.drawerNameTimers.set(annotation.annotationId, timer);
    }

    clearDrawerNameTimer(annotationId) {
        clearTimeout(this.drawerNameTimers.get(annotationId));
        this.drawerNameTimers.delete(annotationId);
    }

    render() {
        const rect = { width: this.canvas.clientWidth, height: this.canvas.clientHeight };
        this.context.clearRect(0, 0, rect.width, rect.height);
        for (const annotation of this.annotations.values()) this.renderAnnotation(annotation, rect);
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

    renderAnnotation(annotation, rect) {
        if (!annotation.points?.length) return;
        const start = annotation.points[0];
        this.context.save();
        this.context.beginPath();
        this.context.strokeStyle = annotation.color;
        this.context.lineWidth = Math.max(2, annotation.width * rect.width);
        this.context.lineCap = 'round';
        this.context.lineJoin = 'round';
        this.context.globalAlpha = annotation.tool === 'highlighter' ? 0.35 : 1;
        if (annotation.tool === 'circle') {
            const end = annotation.points[1] || start;
            const startX = start.x * rect.width;
            const startY = start.y * rect.height;
            const radius = Math.hypot(end.x * rect.width - startX, end.y * rect.height - startY);
            this.context.arc(startX, startY, radius, 0, Math.PI * 2);
        } else {
            this.context.moveTo(start.x * rect.width, start.y * rect.height);
            for (const point of annotation.points.slice(1)) {
                this.context.lineTo(point.x * rect.width, point.y * rect.height);
            }
        }
        this.context.stroke();
        this.context.restore();
        if (annotation.annotationId === this.selectedAnnotationId) this.renderAnnotationSelection(annotation, rect);
        if (annotation.showDrawerName) this.renderDrawerName(annotation, rect);
    }

    renderAnnotationSelection(annotation, rect) {
        if (annotation.tool !== 'circle' || annotation.points.length < 2) return;
        const center = annotation.points[0];
        const edge = annotation.points[1];
        const centerX = center.x * rect.width;
        const centerY = center.y * rect.height;
        const radius = Math.hypot(edge.x * rect.width - centerX, edge.y * rect.height - centerY);
        this.context.save();
        this.context.beginPath();
        this.context.setLineDash([6, 4]);
        this.context.strokeStyle = '#4caf50';
        this.context.lineWidth = 2;
        this.context.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
        this.context.stroke();
        this.context.restore();
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
        if (VideoDrawingOverlay.getLocalDrawerId?.() === this.screenOwnerId && this.textAnnotations.size) {
            VideoDrawingOverlay.onEmitDrawing?.({
                type: 'text',
                action: 'clear',
                screenOwnerId: this.screenOwnerId,
            });
        }
        clearTimeout(this.syncTimer);
        for (const timer of this.clearTimers.values()) clearTimeout(timer);
        for (const timer of this.drawerNameTimers.values()) clearTimeout(timer);
        this.resizeObserver.disconnect();
        this.textInput?.remove();
        this.clearTextAnnotations();
        this.annotations.clear();
        for (const control of this.toolbar?.querySelectorAll('button, input') || []) control._tippy?.destroy();
        this.toolbar?.remove();
        this.canvas.remove();
        VideoDrawingOverlay.pendingTextEvents.delete(this.screenOwnerId);
        VideoDrawingOverlay.pendingAnnotationEvents.delete(this.screenOwnerId);
        VideoDrawingOverlay.overlays.delete(this.screenOwnerId);
    }

    static getOrCreate(screenOwnerId, screenWrap, video) {
        return this.overlays.get(screenOwnerId) || new VideoDrawingOverlay(screenOwnerId, screenWrap, video);
    }

    static receive(data) {
        const overlay = data && this.overlays.get(data.screenOwnerId);
        if (data?.type === 'text') {
            if (overlay) {
                overlay.receiveText(data);
            } else {
                const pending = this.pendingTextEvents.get(data.screenOwnerId) || [];
                if (pending.length < 200) pending.push(data);
                this.pendingTextEvents.set(data.screenOwnerId, pending);
            }
            return;
        }
        if (data?.type === 'annotation') {
            if (overlay) {
                overlay.receiveAnnotation(data);
            } else {
                const pending = this.pendingAnnotationEvents.get(data.screenOwnerId) || [];
                if (pending.length < 500) pending.push(data);
                this.pendingAnnotationEvents.set(data.screenOwnerId, pending);
            }
            return;
        }
        overlay?.addRemotePoints(data.drawerId, data.points, data.end);
    }

    static destroyById(screenOwnerId) {
        this.pendingTextEvents.delete(screenOwnerId);
        this.pendingAnnotationEvents.delete(screenOwnerId);
        this.overlays.get(screenOwnerId)?.destroy();
    }
}
