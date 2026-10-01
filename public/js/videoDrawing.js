'use strict';

class VideoDrawingOverlay {
    static overlays = new Map();
    static pendingTextEvents = new Map();
    static pendingAnnotationEvents = new Map();
    static pendingPermissions = new Map();
    static onEmitDrawing = null;
    static getLocalDrawerId = null;
    static resolveDrawerName = null;
    static AUTO_CLEAR_MS = 5000;
    static SYNC_INTERVAL_MS = 50;
    static LASER_CLEAR_MS = 1000;
    static LASER_COLOR = '#ff1744';
    static BRUSH_COLOR = 'rgba(255, 255, 0, 0.85)';
    static MAX_TEXT_LENGTH = 1000;

    constructor(screenOwnerId, screenWrap, video) {
        this.screenOwnerId = screenOwnerId;
        this.screenWrap = screenWrap;
        this.video = video;
        this.isActive = false;
        this.isToolbarCollapsed = false;
        this.annotationsHidden = false;
        this.participantsAllowed = true;
        this.tool = null;
        this.isDrawing = false;
        this.strokes = [];
        this.annotations = new Map();
        this.pendingPoints = [];
        this.clearTimers = new Map();
        this.drawerNameTimers = new Map();
        this.remoteStrokes = new Map();
        this.laserPointers = new Map();
        this.laserTimers = new Map();
        this.textAnnotations = new Map();
        this.undoStack = [];
        this.redoStack = [];

        this.canvas = document.createElement('canvas');
        this.canvas.className = 'video-drawing-canvas';
        this.canvas.setAttribute('aria-label', 'Screen annotation canvas');
        this.context = this.canvas.getContext('2d');
        screenWrap.appendChild(this.canvas);

        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        this.handleHistoryKeyDown = this.handleHistoryKeyDown.bind(this);
        this.canvas.addEventListener('pointerdown', this.handlePointerDown);
        this.canvas.addEventListener('pointermove', this.handlePointerMove);
        this.canvas.addEventListener('pointerup', this.handlePointerUp);
        this.canvas.addEventListener('pointercancel', this.handlePointerUp);
        this.canvas.addEventListener('pointerleave', () => this.stopLaser());
        document.addEventListener('keydown', this.handleHistoryKeyDown);

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(screenWrap);
        video.addEventListener('loadedmetadata', () => this.resize(), { once: true });
        this.resize();
        VideoDrawingOverlay.overlays.set(screenOwnerId, this);
        if (VideoDrawingOverlay.pendingPermissions.has(screenOwnerId)) {
            this.setParticipantsAllowed(VideoDrawingOverlay.pendingPermissions.get(screenOwnerId));
            VideoDrawingOverlay.pendingPermissions.delete(screenOwnerId);
        }
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
        this.constrainToolbarPosition();
        this.render();
    }

    bindControls(drawingButton) {
        this.drawingButton = drawingButton;
        this.color = '#ffeb3b';
        this.width = 0.004;
        this.textStyle = {
            color: '#ffffff',
            fontSize: 16,
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            textAlign: 'left',
            backgroundColor: 'transparent',
            rotation: 0,
            boxWidth: 0.35,
        };
        this.lastDrawingTool = 'pencil';
        const translateTooltip = (label) => window.i18n?.t(label, 'tooltips') || label;
        const setTranslatedAttribute = (element, attribute, label, namespace) => {
            element[`__i18nAttr_${attribute}`] = label;
            element.setAttribute(attribute, window.i18n?.t(label, namespace) || label);
        };
        const setAccessibleLabel = (element, label) => {
            setTranslatedAttribute(element, 'aria-label', label, 'tooltips');
        };

        const annotationTooltipLabels = [
            'Move annotation toolbar',
            'Pencil',
            'Highlighter',
            'Vanishing pen',
            'Laser pointer',
            'Yellow annotation color',
            'Red annotation color',
            'Green annotation color',
            'Blue annotation color',
            'White annotation color',
            'Circle',
            'Rectangle',
            'Diamond',
            'Arrow',
            'Text',
            'Select and move',
            'Erase my annotations',
            'Hide annotations',
            'Show annotations',
            'Disable participant annotations',
            'Enable participant annotations',
            'Annotation color',
            'Annotation width',
            'Undo annotation',
            'Redo annotation',
            'Delete selected annotation',
            'Clear my screen annotations',
            'Clear screen annotations',
            'Download annotated screen (PNG)',
            'Download annotated screen (PDF)',
            'Hide annotation toolbar',
        ];
        annotationTooltipLabels.forEach(translateTooltip);

        const toolbar = document.createElement('div');
        toolbar.className = 'video-drawing-toolbar';
        toolbar.setAttribute('role', 'toolbar');
        toolbar.setAttribute('aria-orientation', 'horizontal');
        setTranslatedAttribute(toolbar, 'aria-label', 'Screen annotation tools', 'labels');
        this.toolbarPanels = new Map();
        const primary = document.createElement('div');
        primary.className = 'video-drawing-toolbar-primary';
        toolbar.appendChild(primary);
        const secondaryTools = this.createToolbarGroup('Drawing tools', setTranslatedAttribute);
        const addPanel = (name, icon, label, panel) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = icon;
            setAccessibleLabel(button, label);
            button.setAttribute('aria-expanded', 'false');
            panel.id = `video-drawing-${name}-${this.screenOwnerId}`;
            panel.classList.add('video-drawing-toolbar-panel');
            panel.hidden = true;
            button.setAttribute('aria-controls', panel.id);
            button.addEventListener('click', () => this.setToolbarPanel(panel.hidden ? name : null));
            primary.appendChild(button);
            toolbar.appendChild(panel);
            this.toolbarPanels.set(name, { button, panel });
            if (typeof setTippy === 'function') setTippy(button, label, 'bottom');
            return button;
        };

        const dragHandle = document.createElement('button');
        dragHandle.type = 'button';
        dragHandle.className = 'video-drawing-drag-handle fas fa-arrows-alt';
        setAccessibleLabel(dragHandle, 'Move annotation toolbar');
        primary.appendChild(dragHandle);

        const drawingTools = this.createToolbarGroup('Drawing tools', setTranslatedAttribute);
        const tools = [
            ['pencil', 'fas fa-pencil-alt', 'Pencil'],
            ['highlighter', 'fas fa-highlighter', 'Highlighter'],
            ['vanishing', 'fas fa-wand-magic-sparkles', 'Vanishing pen'],
            ['laser', 'fas fa-bullseye', 'Laser pointer'],
            ['circle', 'far fa-circle', 'Circle'],
            ['rectangle', 'far fa-square', 'Rectangle'],
            ['diamond', 'video-drawing-diamond far fa-square', 'Diamond'],
            ['arrow', 'fas fa-arrow-right-long', 'Arrow'],
            ['text', 'fas fa-font', 'Text'],
            ['select', 'fas fa-mouse-pointer', 'Select and move'],
            ['eraser', 'fas fa-eraser', 'Erase my annotations'],
        ];
        this.toolButtons = {};
        for (const [tool, icon, label] of tools) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = icon;
            setAccessibleLabel(button, label);
            button.setAttribute('aria-pressed', 'false');
            button.addEventListener('click', () => {
                this.lastDrawingTool = tool;
                this.setTool(tool);
                this.setToolbarPanel(null, true);
            });
            const group = ['pencil', 'highlighter', 'laser', 'select', 'eraser'].includes(tool)
                ? drawingTools
                : secondaryTools;
            group.appendChild(button);
            this.toolButtons[tool] = button;
        }
        drawingTools.prepend(this.toolButtons.select);
        primary.appendChild(drawingTools);
        addPanel('tools', 'fas fa-shapes', 'Drawing tools', secondaryTools);

        const appearanceTools = this.createToolbarGroup('Annotation appearance', setTranslatedAttribute);
        const color = document.createElement('input');
        color.type = 'color';
        color.value = this.color;
        color.className = 'video-drawing-color';
        setAccessibleLabel(color, 'Annotation color');
        color.addEventListener('input', () => {
            this.setColor(color.value);
        });
        this.colorInput = color;
        this.colorButtons = [];
        for (const [value, label] of [
            ['#ffeb3b', 'Yellow annotation color'],
            ['#ff1744', 'Red annotation color'],
            ['#4caf50', 'Green annotation color'],
            ['#2196f3', 'Blue annotation color'],
            ['#ffffff', 'White annotation color'],
        ]) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'video-drawing-swatch';
            button.dataset.color = value;
            setAccessibleLabel(button, label);
            const swatch = document.createElement('span');
            swatch.style.backgroundColor = value;
            button.appendChild(swatch);
            button.addEventListener('click', () => this.setColor(value));
            appearanceTools.appendChild(button);
            this.colorButtons.push(button);
        }
        this.setColor(this.color);
        appearanceTools.appendChild(color);

        const width = document.createElement('input');
        width.type = 'range';
        width.min = '0.002';
        width.max = '0.012';
        width.step = '0.002';
        width.value = String(this.width);
        width.className = 'video-drawing-width';
        setAccessibleLabel(width, 'Annotation width');
        width.addEventListener('input', () => {
            this.width = Number(width.value);
            this.widthPreview.style.height = `${Math.round(this.width * 1000)}px`;
        });
        appearanceTools.appendChild(width);
        const widthPreview = document.createElement('span');
        widthPreview.className = 'video-drawing-width-preview';
        widthPreview.setAttribute('aria-hidden', 'true');
        widthPreview.style.height = `${Math.round(this.width * 1000)}px`;
        widthPreview.style.backgroundColor = this.color;
        appearanceTools.appendChild(widthPreview);
        this.widthPreview = widthPreview;
        this.appearanceButton = addPanel(
            'appearance',
            'video-drawing-appearance',
            'Annotation appearance',
            appearanceTools
        );
        const currentColor = document.createElement('span');
        currentColor.style.backgroundColor = this.color;
        this.appearanceButton.appendChild(currentColor);

        const historyTools = this.createToolbarGroup('Annotation history', setTranslatedAttribute);
        const undoButton = document.createElement('button');
        undoButton.type = 'button';
        undoButton.className = 'fas fa-undo';
        setAccessibleLabel(undoButton, 'Undo annotation');
        undoButton.disabled = true;
        undoButton.addEventListener('click', () => this.undo());
        historyTools.appendChild(undoButton);
        this.undoButton = undoButton;

        const redoButton = document.createElement('button');
        redoButton.type = 'button';
        redoButton.className = 'fas fa-redo';
        setAccessibleLabel(redoButton, 'Redo annotation');
        redoButton.disabled = true;
        redoButton.addEventListener('click', () => this.redo());
        historyTools.appendChild(redoButton);
        this.redoButton = redoButton;

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'video-drawing-delete fas fa-trash-alt';
        setAccessibleLabel(deleteButton, 'Delete selected annotation');
        deleteButton.disabled = true;
        deleteButton.addEventListener('click', () => this.deleteSelectedAnnotation());
        primary.appendChild(historyTools);
        this.deleteButton = deleteButton;
        const moreTools = this.createToolbarGroup('More annotation options', setTranslatedAttribute);
        moreTools.appendChild(deleteButton);

        const clearButton = document.createElement('button');
        clearButton.type = 'button';
        clearButton.className = 'video-drawing-clear fas fa-broom';
        const clearLabel =
            VideoDrawingOverlay.getLocalDrawerId?.() === this.screenOwnerId
                ? 'Clear screen annotations'
                : 'Clear my screen annotations';
        setAccessibleLabel(clearButton, clearLabel);
        clearButton.addEventListener('click', () => this.clearAnnotations(true));
        moreTools.appendChild(clearButton);
        this.clearButton = clearButton;

        const visibilityButton = document.createElement('button');
        visibilityButton.type = 'button';
        visibilityButton.addEventListener('click', () => this.setAnnotationsHidden(!this.annotationsHidden));
        moreTools.appendChild(visibilityButton);
        this.visibilityButton = visibilityButton;

        if (VideoDrawingOverlay.getLocalDrawerId?.() === this.screenOwnerId) {
            const permissionsButton = document.createElement('button');
            permissionsButton.type = 'button';
            permissionsButton.addEventListener('click', () => {
                VideoDrawingOverlay.onEmitDrawing?.({
                    type: 'permissions',
                    screenOwnerId: this.screenOwnerId,
                    allowed: !this.participantsAllowed,
                });
            });
            moreTools.appendChild(permissionsButton);
            this.permissionsButton = permissionsButton;
        }

        const exportTools = this.createToolbarGroup('Annotation downloads', setTranslatedAttribute);
        this.downloadButtons = [];
        for (const [format, icon, label] of [
            ['png', 'fas fa-download', 'Download annotated screen (PNG)'],
            ['pdf', 'fas fa-file-pdf', 'Download annotated screen (PDF)'],
        ]) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = icon;
            setAccessibleLabel(button, label);
            button.addEventListener('click', () => this.downloadSnapshot(format));
            exportTools.appendChild(button);
            this.downloadButtons.push(button);
        }
        moreTools.appendChild(exportTools);
        const exitButton = document.createElement('button');
        exitButton.type = 'button';
        exitButton.className = 'fas fa-power-off';
        setAccessibleLabel(exitButton, 'Disable screen drawing');
        exitButton.addEventListener('click', () => {
            this.setTool(null);
            drawingButton.focus();
        });
        moreTools.appendChild(exitButton);
        addPanel('more', 'fas fa-ellipsis-h', 'More annotation options', moreTools);

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'video-drawing-close fas fa-chevron-up';
        setAccessibleLabel(closeButton, 'Hide annotation toolbar');
        closeButton.addEventListener('click', () => this.setToolbarCollapsed(true));
        primary.appendChild(closeButton);
        toolbar.addEventListener('keydown', (event) => this.handleToolbarKeyDown(event));
        this.handleToolbarOutsidePointer = (event) => {
            if (!toolbar.contains(event.target)) this.setToolbarPanel(null);
        };
        document.addEventListener('pointerdown', this.handleToolbarOutsidePointer);

        this.toolbar = toolbar;
        this.screenWrap.appendChild(toolbar);
        this.widthInput = width;
        this.updateAnnotationControls();
        if (typeof setTippy === 'function') {
            for (const [element, label] of [
                [dragHandle, 'Move annotation toolbar'],
                ...tools.map(([tool, , label]) => [this.toolButtons[tool], label]),
                [color, 'Annotation color'],
                ...this.colorButtons.map((button) => [button, button['__i18nAttr_aria-label']]),
                [width, 'Annotation width'],
                [undoButton, 'Undo annotation'],
                [redoButton, 'Redo annotation'],
                [deleteButton, 'Delete selected annotation'],
                [clearButton, clearLabel],
                [visibilityButton, visibilityButton['__i18nAttr_aria-label']],
                ...(this.permissionsButton
                    ? [[this.permissionsButton, this.permissionsButton['__i18nAttr_aria-label']]]
                    : []),
                ...this.downloadButtons.map((button) => [button, button['__i18nAttr_aria-label']]),
                [exitButton, 'Disable screen drawing'],
                [closeButton, 'Hide annotation toolbar'],
            ]) {
                setTippy(element, label, 'bottom');
            }
        }
        this.bindToolbarDrag(toolbar, dragHandle);

        drawingButton.addEventListener('click', () => {
            if (this.isActive && this.isToolbarCollapsed) {
                this.setToolbarCollapsed(false);
                return;
            }
            const tool = this.isActive ? null : this.lastDrawingTool;
            this.setTool(tool);
        });
    }

    createToolbarGroup(label, setTranslatedAttribute) {
        const group = document.createElement('div');
        group.className = 'video-drawing-toolbar-group';
        group.setAttribute('role', 'group');
        setTranslatedAttribute(group, 'aria-label', label, 'labels');
        return group;
    }

    setToolbarPanel(name, restoreFocus = false) {
        for (const [panelName, { button, panel }] of this.toolbarPanels || []) {
            if (!panel.hidden && panelName !== name && restoreFocus) button.focus();
            panel.hidden = panelName !== name;
            button.setAttribute('aria-expanded', String(!panel.hidden));
        }
        this.constrainToolbarPosition();
    }

    handleToolbarKeyDown(event) {
        if (event.key === 'Escape') {
            if ([...this.toolbarPanels.values()].some(({ panel }) => !panel.hidden)) {
                this.setToolbarPanel(null, true);
            } else {
                this.setToolbarCollapsed(true);
            }
            event.preventDefault();
            event.stopPropagation();
            return;
        }
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || event.target.tagName !== 'BUTTON') {
            return;
        }
        const buttons = [...this.toolbar.querySelectorAll('button:not(:disabled)')].filter(
            (button) => button.offsetParent !== null
        );
        const currentIndex = buttons.indexOf(event.target);
        if (currentIndex === -1) return;
        event.preventDefault();
        const nextIndex =
            event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? buttons.length - 1
                  : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
        buttons[nextIndex].focus();
    }

    bindToolbarDrag(toolbar, dragHandle) {
        let drag = null;
        const moveToolbar = (left, top) => this.setToolbarPosition(left, top);
        dragHandle.addEventListener('pointerdown', (event) => {
            if (event.button > 0) return;
            event.preventDefault();
            const toolbarRect = toolbar.getBoundingClientRect();
            const parentRect = this.screenWrap.getBoundingClientRect();
            const scaleX = this.screenWrap.offsetWidth ? parentRect.width / this.screenWrap.offsetWidth : 1;
            const scaleY = this.screenWrap.offsetHeight ? parentRect.height / this.screenWrap.offsetHeight : 1;
            const left = (toolbarRect.left - parentRect.left) / scaleX;
            const top = (toolbarRect.top - parentRect.top) / scaleY;

            moveToolbar(left, top);
            drag = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, left, top };
            dragHandle.setPointerCapture(event.pointerId);
        });
        dragHandle.addEventListener('pointermove', (event) => {
            if (!drag || drag.pointerId !== event.pointerId) return;
            const parentRect = this.screenWrap.getBoundingClientRect();
            const scaleX = this.screenWrap.offsetWidth ? parentRect.width / this.screenWrap.offsetWidth : 1;
            const scaleY = this.screenWrap.offsetHeight ? parentRect.height / this.screenWrap.offsetHeight : 1;
            const left = drag.left + (event.clientX - drag.clientX) / scaleX;
            const top = drag.top + (event.clientY - drag.clientY) / scaleY;

            moveToolbar(left, top);
        });
        const finishDrag = (event) => {
            if (!drag || drag.pointerId !== event.pointerId) return;
            drag = null;
        };
        dragHandle.addEventListener('pointerup', finishDrag);
        dragHandle.addEventListener('pointercancel', finishDrag);
        dragHandle.addEventListener('keydown', (event) => {
            if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
            event.preventDefault();
            event.stopPropagation();
            const step = event.shiftKey ? 24 : 8;
            const left = Number.parseFloat(toolbar.style.left) || toolbar.offsetLeft;
            const top = Number.parseFloat(toolbar.style.top) || toolbar.offsetTop;
            moveToolbar(
                left + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0),
                top + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0)
            );
        });
    }

    setToolbarPosition(left, top) {
        if (!this.toolbar) return;
        const maxLeft = Math.max(0, this.screenWrap.clientWidth - this.toolbar.offsetWidth);
        const maxTop = Math.max(0, this.screenWrap.clientHeight - this.toolbar.offsetHeight);
        this.toolbar.style.left = `${Math.max(0, Math.min(maxLeft, left))}px`;
        this.toolbar.style.top = `${Math.max(0, Math.min(maxTop, top))}px`;
        this.toolbar.style.transform = 'none';
    }

    constrainToolbarPosition() {
        if (!this.toolbar || this.toolbar.style.transform !== 'none') return;
        this.setToolbarPosition(
            Number.parseFloat(this.toolbar.style.left) || 0,
            Number.parseFloat(this.toolbar.style.top) || 0
        );
    }

    setToolbarCollapsed(collapsed) {
        this.isToolbarCollapsed = collapsed;
        if (collapsed) this.setToolbarPanel(null);
        this.toolbar.classList.toggle('video-drawing-toolbar-collapsed', collapsed);
        if (collapsed && this.toolbar.contains(document.activeElement) && !this.drawingButton.hidden) {
            this.drawingButton.focus();
        }
        this.updateModeButtons();
    }

    updateModeButtons() {
        const selected = this.isActive;
        this.drawingButton.classList.toggle('video-drawing-tool-active', selected);
        this.drawingButton.setAttribute('aria-pressed', String(selected));
        const accessibleLabel =
            selected && this.isToolbarCollapsed
                ? 'Show annotation toolbar'
                : `${selected ? 'Disable' : 'Enable'} screen drawing`;
        const translatedLabel = window.i18n?.t(accessibleLabel, 'tooltips') || accessibleLabel;
        this.drawingButton['__i18nAttr_aria-label'] = accessibleLabel;
        this.drawingButton.setAttribute('aria-label', translatedLabel);
        if (this.drawingButton._tippy) {
            this.drawingButton._tippy.__i18nSrc = accessibleLabel;
            this.drawingButton._tippy.setContent(translatedLabel);
        }
    }

    setColor(color) {
        this.color = color;
        this.colorInput.value = color;
        if (this.appearanceButton) this.appearanceButton.firstChild.style.backgroundColor = color;
        if (this.widthPreview) this.widthPreview.style.backgroundColor = color;
        for (const button of this.colorButtons) {
            const selected = button.dataset.color === color;
            button.classList.toggle('video-drawing-tool-active', selected);
            button.setAttribute('aria-pressed', String(selected));
        }
    }

    canAnnotate() {
        return this.participantsAllowed !== false || VideoDrawingOverlay.getLocalDrawerId?.() === this.screenOwnerId;
    }

    canInteract() {
        return this.canAnnotate() && !this.annotationsHidden;
    }

    updateToggleButton(button, label, pressed, icon) {
        if (!button) return;
        button.className = icon;
        button['__i18nAttr_aria-label'] = label;
        const translated = window.i18n?.t(label, 'tooltips') || label;
        button.setAttribute('aria-label', translated);
        button.setAttribute('aria-pressed', String(pressed));
        if (button._tippy) {
            button._tippy.__i18nSrc = label;
            button._tippy.setContent(translated);
        }
    }

    updateAnnotationControls() {
        const disabled = !this.canInteract();
        this.screenWrap.classList.toggle('video-drawing-annotations-hidden', this.annotationsHidden);
        this.screenWrap.classList.toggle('video-drawing-readonly', !this.canAnnotate());
        this.screenWrap.classList.toggle('video-drawing-erasing', this.isActive && this.tool === 'eraser' && !disabled);
        this.canvas.classList.toggle('video-drawing-active', this.isActive && this.tool !== 'view' && !disabled);
        for (const button of Object.values(this.toolButtons || {})) button.disabled = disabled;
        for (const control of [this.colorInput, this.widthInput, this.clearButton, ...(this.colorButtons || [])]) {
            if (control) control.disabled = disabled;
        }
        this.updateHistoryButtons();
        if (this.deleteButton) {
            const selected =
                this.annotations.get(this.selectedAnnotationId) ||
                this.textAnnotations.get(this.selectedTextAnnotationId);
            this.deleteButton.disabled = !selected || !this.canManageAnnotation(selected);
        }
        this.updateToggleButton(
            this.visibilityButton,
            this.annotationsHidden ? 'Show annotations' : 'Hide annotations',
            this.annotationsHidden,
            this.annotationsHidden ? 'fas fa-eye-slash' : 'fas fa-eye'
        );
        this.updateToggleButton(
            this.permissionsButton,
            this.participantsAllowed ? 'Disable participant annotations' : 'Enable participant annotations',
            this.participantsAllowed,
            this.participantsAllowed ? 'fas fa-unlock' : 'fas fa-lock'
        );
    }

    cancelInteraction() {
        this.stopLaser();
        this.finishErasing();
        if (this.activeAnnotation) this.annotations.delete(this.activeAnnotation.annotationId);
        if (this.draggedAnnotation) this.draggedAnnotation.annotation.points = this.draggedAnnotation.originalPoints;
        if (this.activeStroke) this.strokes = this.strokes.filter((stroke) => stroke !== this.activeStroke);
        this.activeAnnotation = null;
        this.draggedAnnotation = null;
        this.activeStroke = null;
        this.isDrawing = false;
        clearTimeout(this.syncTimer);
        this.syncTimer = null;
        this.pendingPoints = [];
        this.pendingEnd = false;
        if (this.canvas.hasPointerCapture?.(this.drawingPointerId))
            this.canvas.releasePointerCapture(this.drawingPointerId);
        this.textInput?.querySelector('.video-drawing-text-cancel')?.click();
        for (const annotation of this.textAnnotations.values()) annotation.element.__cancelDrag?.();
        this.render();
    }

    setAnnotationsHidden(hidden) {
        if (hidden) this.cancelInteraction();
        this.annotationsHidden = hidden;
        this.updateAnnotationControls();
        this.render();
    }

    setParticipantsAllowed(allowed) {
        if (typeof allowed !== 'boolean') return;
        this.participantsAllowed = allowed;
        if (!this.canAnnotate()) this.cancelInteraction();
        if (this.toolbar && this.isActive && (!this.canAnnotate() || this.tool === 'view')) {
            this.setTool(this.canAnnotate() ? this.lastDrawingTool : 'view');
        }
        this.updateAnnotationControls();
    }

    setTool(tool) {
        if (!tool) this.setToolbarPanel(null);
        if (tool && this.isToolbarCollapsed) this.setToolbarCollapsed(false);
        if (tool && !this.canAnnotate()) tool = 'view';
        if (tool !== this.tool && this.isDrawing) this.cancelInteraction();
        if (this.tool === 'laser' && tool !== 'laser') this.stopLaser();
        this.isActive = Boolean(tool);
        this.tool = tool;
        this.canvas.classList.toggle('video-drawing-active', this.isActive);
        this.canvas.classList.toggle('video-drawing-selecting', tool === 'select');
        this.toolbar.classList.toggle('video-drawing-toolbar-active', this.isActive);
        for (const [buttonTool, button] of Object.entries(this.toolButtons)) {
            const selected = this.isActive && buttonTool === tool;
            button.classList.toggle('video-drawing-tool-active', selected);
            button.setAttribute('aria-pressed', String(selected));
        }
        const secondaryTools = this.toolbarPanels.get('tools');
        const selectedButton = this.toolButtons[tool];
        secondaryTools.button.className =
            selectedButton && secondaryTools.panel.contains(selectedButton)
                ? selectedButton.className
                : 'fas fa-shapes';
        this.updateModeButtons();
        if (tool !== 'select') this.selectAnnotation(null);
        for (const annotation of this.textAnnotations.values()) {
            annotation.element.classList.toggle('video-drawing-text-select-mode', tool === 'select');
        }
        if (tool !== 'text') this.textInput?.remove();
        this.updateAnnotationControls();
    }

    handlePointerDown(event) {
        if (!this.isActive || !this.canInteract() || event.button > 0) return;
        event.preventDefault();
        this.drawingPointerId = event.pointerId;
        if (this.tool === 'eraser') {
            this.canvas.setPointerCapture(event.pointerId);
            this.isDrawing = true;
            this.eraserUndoCommands = [];
            this.eraserRedoCommands = [];
            this.eraseAlong(event);
            return;
        }
        if (this.tool === 'laser') {
            this.moveLaser(event);
            return;
        }
        if (this.tool === 'text') {
            this.beginTextInput(event);
            return;
        }
        if (this.tool === 'select') {
            const point = this.getPoint(event);
            const annotation = this.findAnnotationAtPoint(point);
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
        if (['pencil', 'highlighter', 'circle', 'rectangle', 'diamond', 'arrow'].includes(this.tool)) {
            const point = this.getPoint(event);
            const annotation = {
                annotationId: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                drawerId: VideoDrawingOverlay.getLocalDrawerId?.(),
                tool: this.tool,
                color: this.color,
                width: this.tool === 'highlighter' ? Math.min(0.05, this.width * 4.5) : this.width,
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
        if (!this.canInteract()) return;
        if (this.isDrawing && this.tool === 'eraser') {
            event.preventDefault();
            this.eraseAlong(event);
            return;
        }
        if (this.isActive && this.tool === 'laser') {
            event.preventDefault();
            this.moveLaser(event);
            return;
        }
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
            if (['circle', 'rectangle', 'diamond', 'arrow'].includes(this.activeAnnotation.tool)) {
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
        if (this.tool === 'eraser' && this.isDrawing) {
            if (event.type !== 'pointercancel') this.eraseAlong(event);
            this.isDrawing = false;
            this.finishErasing();
            return;
        }
        if (this.tool === 'laser') {
            if (event.type === 'pointercancel' || (event.pointerType && event.pointerType !== 'mouse'))
                this.stopLaser();
            return;
        }
        if (!this.isDrawing) return;
        event.preventDefault();
        this.isDrawing = false;
        if (this.draggedAnnotation) {
            const { annotation, originalPoints } = this.draggedAnnotation;
            this.draggedAnnotation = null;
            this.scheduleDrawerNameClear(annotation);
            this.recordHistory(
                [{ action: 'move', annotationId: annotation.annotationId, points: originalPoints }],
                [{ action: 'move', annotationId: annotation.annotationId, points: this.clonePoints(annotation.points) }]
            );
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
            this.recordHistory(
                [{ action: 'delete', annotationId: annotation.annotationId }],
                [{ action: 'create', annotation: this.cloneAnnotation(annotation) }]
            );
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

    eraseAlong(event) {
        const point = this.getPoint(event);
        const start = this.eraserLastPoint || point;
        const distance = Math.hypot(
            (point.x - start.x) * this.canvas.clientWidth,
            (point.y - start.y) * this.canvas.clientHeight
        );
        const steps = Math.max(1, Math.ceil(distance / 8));
        for (let index = 1; index <= steps; index++) {
            this.eraseAtPoint({
                x: start.x + ((point.x - start.x) * index) / steps,
                y: start.y + ((point.y - start.y) * index) / steps,
            });
        }
        this.eraserLastPoint = point;
    }

    eraseAtPoint(point) {
        const localDrawerId = VideoDrawingOverlay.getLocalDrawerId?.();
        let annotation;
        while ((annotation = this.findAnnotationAtPoint(point, (item) => item.drawerId === localDrawerId))) {
            this.eraserUndoCommands.push({ action: 'create', annotation: this.cloneAnnotation(annotation) });
            this.eraserRedoCommands.push({ action: 'delete', annotationId: annotation.annotationId });
            this.receiveAnnotation({ action: 'delete', annotationId: annotation.annotationId });
            VideoDrawingOverlay.onEmitDrawing?.({
                type: 'annotation',
                action: 'delete',
                screenOwnerId: this.screenOwnerId,
                annotationId: annotation.annotationId,
            });
        }
        const canvasRect = this.canvas.getBoundingClientRect();
        const clientX = canvasRect.left + point.x * canvasRect.width;
        const clientY = canvasRect.top + point.y * canvasRect.height;
        for (const text of this.textAnnotations.values()) {
            if (text.drawerId !== localDrawerId) continue;
            const bounds = text.element.getBoundingClientRect();
            if (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom)
                continue;
            this.eraserUndoCommands.push({
                type: 'text',
                action: 'create',
                annotation: this.cloneTextAnnotation(text),
            });
            this.eraserRedoCommands.push({ type: 'text', action: 'delete', annotationId: text.annotationId });
            this.deleteTextAnnotation(text.annotationId);
            VideoDrawingOverlay.onEmitDrawing?.({
                type: 'text',
                action: 'delete',
                screenOwnerId: this.screenOwnerId,
                annotationId: text.annotationId,
            });
        }
    }

    finishErasing() {
        if (this.eraserUndoCommands?.length) this.recordHistory(this.eraserUndoCommands, this.eraserRedoCommands);
        this.eraserUndoCommands = null;
        this.eraserRedoCommands = null;
        this.eraserLastPoint = null;
    }

    moveLaser(event) {
        const point = this.getPoint(event);
        const drawerId = VideoDrawingOverlay.getLocalDrawerId?.() || 'local';
        this.receiveLaser({ drawerId, points: [point] });
        this.pendingLaserPoint = point;
        if (this.laserSyncTimer) return;
        this.laserSyncTimer = setTimeout(() => {
            this.laserSyncTimer = null;
            const pendingPoint = this.pendingLaserPoint;
            this.pendingLaserPoint = null;
            if (!pendingPoint) return;
            VideoDrawingOverlay.onEmitDrawing?.({
                type: 'laser',
                screenOwnerId: this.screenOwnerId,
                points: [{ x: Number(pendingPoint.x.toFixed(4)), y: Number(pendingPoint.y.toFixed(4)) }],
                end: false,
            });
        }, VideoDrawingOverlay.SYNC_INTERVAL_MS);
    }

    stopLaser() {
        clearTimeout(this.laserSyncTimer);
        this.laserSyncTimer = null;
        this.pendingLaserPoint = null;
        const drawerId = VideoDrawingOverlay.getLocalDrawerId?.() || 'local';
        const pointer = this.laserPointers.get(drawerId);
        if (!pointer) return;
        this.receiveLaser({ drawerId, end: true });
        VideoDrawingOverlay.onEmitDrawing?.({
            type: 'laser',
            screenOwnerId: this.screenOwnerId,
            points: pointer.points,
            end: true,
        });
    }

    receiveLaser({ drawerId, points, end }) {
        const key = drawerId || 'remote';
        clearTimeout(this.laserTimers.get(key));
        this.laserTimers.delete(key);
        if (end) {
            this.laserPointers.delete(key);
        } else if (points?.length === 1) {
            this.laserPointers.set(key, { drawerId, points });
            this.laserTimers.set(
                key,
                setTimeout(() => {
                    this.laserPointers.delete(key);
                    this.laserTimers.delete(key);
                    this.render();
                }, VideoDrawingOverlay.LASER_CLEAR_MS)
            );
        }
        this.render();
    }

    getPoint(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
            y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
        };
    }

    beginTextInput(event, annotation = null) {
        if (!this.canInteract() || (annotation && !this.canManageTextAnnotation(annotation))) return;
        this.textInput?.__destroyTooltips?.();
        this.textInput?.remove();
        const point = annotation ? { x: annotation.x, y: annotation.y } : this.getPoint(event);
        const initialStyle = this.getTextStyle(annotation || this.textStyle);
        const setTranslatedAttribute = (element, attribute, label, namespace) => {
            element[`__i18nAttr_${attribute}`] = label;
            element.setAttribute(attribute, window.i18n?.t(label, namespace) || label);
        };
        const setAccessibleLabel = (element, label) => {
            setTranslatedAttribute(element, 'aria-label', label, 'tooltips');
        };
        const textTooltipLabels = [
            'Bold text',
            'Italic text',
            'Underline text',
            'Strikethrough text',
            'Text color',
            'Text size',
            'Text alignment: left. Click to cycle',
            'Text alignment: center. Click to cycle',
            'Text alignment: right. Click to cycle',
            'More text options',
            'Text background',
            'Text background color',
            'Text rotation',
            'Cancel text annotation',
            'Save text annotation',
        ];
        const alignmentTooltipLabels = {
            left: textTooltipLabels[6],
            center: textTooltipLabels[7],
            right: textTooltipLabels[8],
        };
        const editor = document.createElement('div');
        editor.className = 'video-drawing-text-editor';
        editor.setAttribute('role', 'dialog');
        setTranslatedAttribute(editor, 'aria-label', 'Edit screen text annotation', 'labels');

        const controls = document.createElement('div');
        controls.className = 'video-drawing-text-editor-controls';
        const formatting = document.createElement('div');
        formatting.className = 'video-drawing-text-formatting';
        formatting.setAttribute('role', 'group');
        setTranslatedAttribute(formatting, 'aria-label', 'Text formatting', 'labels');
        const appearance = document.createElement('div');
        appearance.className = 'video-drawing-text-appearance';
        const actions = document.createElement('div');
        actions.className = 'video-drawing-text-actions';
        const morePanel = document.createElement('div');
        morePanel.className = 'video-drawing-text-more-panel';
        morePanel.hidden = true;
        morePanel.setAttribute('role', 'group');
        setTranslatedAttribute(morePanel, 'aria-label', 'More text options', 'labels');
        const moreButton = document.createElement('button');
        moreButton.type = 'button';
        moreButton.className = 'fas fa-ellipsis-h';
        setAccessibleLabel(moreButton, 'More text options');
        moreButton.setAttribute('aria-expanded', 'false');
        const setMoreOpen = (open) => {
            if (open) {
                morePanel.style.top = `${controls.offsetTop + controls.offsetHeight + 5}px`;
                morePanel.style.maxHeight = `${input.offsetHeight}px`;
            }
            morePanel.hidden = !open;
            moreButton.setAttribute('aria-expanded', String(open));
        };
        moreButton.addEventListener('click', () => setMoreOpen(morePanel.hidden));
        appearance.appendChild(moreButton);
        controls.append(formatting, appearance, actions);

        const createToggle = (className, label, selected) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = className;
            setAccessibleLabel(button, label);
            button.setAttribute('aria-pressed', String(selected));
            button.addEventListener('click', () => {
                button.setAttribute('aria-pressed', String(button.getAttribute('aria-pressed') !== 'true'));
                updatePreview();
                input.focus();
            });
            return button;
        };

        const bold = createToggle('fas fa-bold', 'Bold text', initialStyle.bold);
        const italic = createToggle('fas fa-italic', 'Italic text', initialStyle.italic);
        const underline = createToggle('fas fa-underline', 'Underline text', initialStyle.underline);
        const strikethrough = createToggle('fas fa-strikethrough', 'Strikethrough text', initialStyle.strikethrough);
        formatting.append(bold, italic, underline, strikethrough);

        let textAlign = initialStyle.textAlign;
        const alignmentButton = document.createElement('button');
        alignmentButton.type = 'button';
        const updateAlignmentButton = () => {
            alignmentButton.className = `video-drawing-text-alignment fas fa-align-${textAlign}`;
            const label = alignmentTooltipLabels[textAlign];
            setAccessibleLabel(alignmentButton, label);
            alignmentButton.dataset.alignment = textAlign;
            if (alignmentButton._tippy && typeof setTippy === 'function') setTippy(alignmentButton, label, 'bottom');
        };
        const setAlignment = (alignment) => {
            textAlign = alignment;
            updateAlignmentButton();
            updatePreview();
            input.focus();
        };
        alignmentButton.addEventListener('click', () => {
            const alignments = ['left', 'center', 'right'];
            setAlignment(alignments[(alignments.indexOf(textAlign) + 1) % alignments.length]);
        });
        updateAlignmentButton();

        const textColor = document.createElement('input');
        textColor.type = 'color';
        textColor.value = initialStyle.color;
        textColor.className = 'video-drawing-text-color';
        setAccessibleLabel(textColor, 'Text color');
        formatting.appendChild(textColor);

        const backgroundToggle = createToggle(
            'fas fa-fill-drip',
            'Text background',
            initialStyle.backgroundColor !== 'transparent'
        );
        const backgroundControls = document.createElement('div');
        backgroundControls.className = 'video-drawing-text-background-controls';
        backgroundControls.appendChild(backgroundToggle);

        const backgroundColor = document.createElement('input');
        backgroundColor.type = 'color';
        backgroundColor.value =
            initialStyle.backgroundColor === 'transparent' ? '#000000' : initialStyle.backgroundColor;
        backgroundColor.className = 'video-drawing-text-background-color';
        setAccessibleLabel(backgroundColor, 'Text background color');
        backgroundControls.appendChild(backgroundColor);

        const fontSize = document.createElement('select');
        fontSize.className = 'video-drawing-text-size';
        setAccessibleLabel(fontSize, 'Text size');
        for (const size of [12, 16, 20, 24, 32]) {
            const option = document.createElement('option');
            option.value = String(size);
            option.textContent = `${size}px`;
            option.selected = size === initialStyle.fontSize;
            fontSize.appendChild(option);
        }
        formatting.append(fontSize, alignmentButton);

        const rotation = document.createElement('select');
        rotation.className = 'video-drawing-text-rotation';
        setAccessibleLabel(rotation, 'Text rotation');
        for (const degrees of [-45, -30, -15, 0, 15, 30, 45]) {
            const option = document.createElement('option');
            option.value = String(degrees);
            option.textContent = `${degrees}°`;
            option.selected = degrees === initialStyle.rotation;
            rotation.appendChild(option);
        }
        for (const [label, control] of [
            ['Background', backgroundControls],
            ['Rotation', rotation],
        ]) {
            const row = document.createElement('div');
            row.className = 'video-drawing-text-more-row';
            const caption = document.createElement('span');
            caption.textContent = window.i18n?.t(label, 'labels') || label;
            row.append(caption, control);
            morePanel.appendChild(row);
        }

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'video-drawing-text-cancel fas fa-times';
        setAccessibleLabel(cancelButton, 'Cancel text annotation');
        actions.appendChild(cancelButton);

        const saveButton = document.createElement('button');
        saveButton.type = 'button';
        saveButton.className = 'video-drawing-text-save fas fa-check';
        setAccessibleLabel(saveButton, 'Save text annotation');
        actions.appendChild(saveButton);

        const input = document.createElement('textarea');
        input.maxLength = VideoDrawingOverlay.MAX_TEXT_LENGTH;
        input.rows = 3;
        input.className = 'video-drawing-text-input';
        const placeholder = 'Type annotation';
        const ariaLabel = 'Screen text annotation';
        input['__i18nAttr_placeholder'] = placeholder;
        input['__i18nAttr_aria-label'] = ariaLabel;
        input.placeholder = window.i18n?.t(placeholder, 'labels') || placeholder;
        input.setAttribute('aria-label', window.i18n?.t(ariaLabel, 'labels') || ariaLabel);
        const updatePreview = () => {
            input.style.color = textColor.value;
            input.style.fontSize = `${fontSize.value}px`;
            input.style.fontWeight = bold.getAttribute('aria-pressed') === 'true' ? '700' : '500';
            input.style.fontStyle = italic.getAttribute('aria-pressed') === 'true' ? 'italic' : 'normal';
            input.style.textDecoration = [
                underline.getAttribute('aria-pressed') === 'true' ? 'underline' : '',
                strikethrough.getAttribute('aria-pressed') === 'true' ? 'line-through' : '',
            ]
                .filter(Boolean)
                .join(' ');
            input.style.textAlign = textAlign;
            input.style.backgroundColor =
                backgroundToggle.getAttribute('aria-pressed') === 'true' ? backgroundColor.value : 'transparent';
        };
        textColor.addEventListener('input', updatePreview);
        backgroundColor.addEventListener('input', () => {
            backgroundToggle.setAttribute('aria-pressed', 'true');
            updatePreview();
        });
        fontSize.addEventListener('change', updatePreview);
        const canvasWidth = this.canvas.clientWidth;
        const canvasHeight = this.canvas.clientHeight;
        const inputWidth = Math.min(
            canvasWidth - 16,
            Math.max(160, annotation ? initialStyle.boxWidth * canvasWidth : Math.min(420, canvasWidth * 0.65))
        );
        const inputLeft = Math.min(point.x * canvasWidth, canvasWidth - inputWidth - 8);
        const inputTop = Math.min(point.y * canvasHeight, canvasHeight - 150);
        editor.style.left = `${this.canvas.offsetLeft + Math.max(8, inputLeft)}px`;
        const editorTop = Math.max(8, inputTop);
        editor.style.top = `${this.canvas.offsetTop + editorTop}px`;
        editor.style.width = `${inputWidth}px`;
        editor.style.maxWidth = `${Math.max(160, canvasWidth - inputLeft - 8)}px`;
        editor.style.maxHeight = `${Math.max(120, canvasHeight - editorTop - 8)}px`;
        input.value = annotation?.text || '';
        updatePreview();
        editor.append(controls, morePanel, input);
        const textControlTooltips = [
            [bold, 'Bold text'],
            [italic, 'Italic text'],
            [underline, 'Underline text'],
            [strikethrough, 'Strikethrough text'],
            [textColor, 'Text color'],
            [fontSize, 'Text size'],
            [alignmentButton, alignmentTooltipLabels[textAlign]],
            [moreButton, 'More text options'],
            [backgroundToggle, 'Text background'],
            [backgroundColor, 'Text background color'],
            [rotation, 'Text rotation'],
            [cancelButton, 'Cancel text annotation'],
            [saveButton, 'Save text annotation'],
        ];
        if (typeof setTippy === 'function') {
            for (const [control, label] of textControlTooltips) setTippy(control, label, 'bottom');
        }
        editor.__destroyTooltips = () => {
            for (const [control] of textControlTooltips) control._tippy?.destroy();
        };
        editor.addEventListener('pointerdown', (editorEvent) => {
            if (!morePanel.contains(editorEvent.target) && !moreButton.contains(editorEvent.target)) setMoreOpen(false);
        });
        editor.addEventListener('focusout', (editorEvent) => {
            if (!editor.contains(editorEvent.relatedTarget)) setMoreOpen(false);
        });
        editor.addEventListener('keydown', (editorEvent) => {
            if (editorEvent.key === 'Escape') {
                editorEvent.preventDefault();
                if (!morePanel.hidden) {
                    setMoreOpen(false);
                    moreButton.focus();
                } else {
                    finish(false);
                }
            }
            editorEvent.stopPropagation();
        });
        this.screenWrap.appendChild(editor);
        this.textInput = editor;
        annotation?.element.classList.add('video-drawing-text-editing');

        let finished = false;
        const finish = (commit) => {
            if (finished) return;
            finished = true;
            const text = input.value.trim();
            const style = this.getTextStyle({
                color: textColor.value,
                fontSize: Number(fontSize.value),
                bold: bold.getAttribute('aria-pressed') === 'true',
                italic: italic.getAttribute('aria-pressed') === 'true',
                underline: underline.getAttribute('aria-pressed') === 'true',
                strikethrough: strikethrough.getAttribute('aria-pressed') === 'true',
                textAlign,
                backgroundColor:
                    backgroundToggle.getAttribute('aria-pressed') === 'true' ? backgroundColor.value : 'transparent',
                rotation: Number(rotation.value),
                boxWidth: editor.offsetWidth / canvasWidth,
            });
            editor.__destroyTooltips();
            editor.remove();
            if (this.textInput === editor) this.textInput = null;
            annotation?.element.classList.remove('video-drawing-text-editing');
            if (!commit || !text || !this.canInteract()) return;

            if (annotation) {
                const previousAnnotation = this.cloneTextAnnotation(annotation);
                const nextAnnotation = { ...previousAnnotation, text, ...style };
                if (JSON.stringify(previousAnnotation) === JSON.stringify(nextAnnotation)) return;
                this.updateTextAnnotation(annotation.annotationId, nextAnnotation);
                this.recordHistory(
                    [{ type: 'text', action: 'update', ...previousAnnotation }],
                    [{ type: 'text', action: 'update', ...nextAnnotation }]
                );
                VideoDrawingOverlay.onEmitDrawing?.({
                    type: 'text',
                    action: 'update',
                    screenOwnerId: this.screenOwnerId,
                    ...nextAnnotation,
                });
                return;
            }

            const newAnnotation = {
                type: 'text',
                annotationId: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                drawerId: VideoDrawingOverlay.getLocalDrawerId?.(),
                text,
                ...style,
                ...point,
            };
            this.textStyle = style;
            this.addTextAnnotation(newAnnotation);
            this.recordHistory(
                [{ type: 'text', action: 'delete', annotationId: newAnnotation.annotationId }],
                [{ type: 'text', action: 'create', annotation: this.cloneTextAnnotation(newAnnotation) }]
            );
            VideoDrawingOverlay.onEmitDrawing?.({
                type: 'text',
                action: 'create',
                screenOwnerId: this.screenOwnerId,
                annotationId: newAnnotation.annotationId,
                text,
                ...style,
                x: Number(point.x.toFixed(4)),
                y: Number(point.y.toFixed(4)),
            });
        };

        input.addEventListener('keydown', (inputEvent) => {
            const shortcut = inputEvent.metaKey || inputEvent.ctrlKey;
            if (shortcut && !inputEvent.altKey) {
                const key = inputEvent.key.toLowerCase();
                const toggle =
                    key === 'b'
                        ? bold
                        : key === 'i'
                          ? italic
                          : key === 'u'
                            ? underline
                            : inputEvent.shiftKey && key === 'x'
                              ? strikethrough
                              : null;
                if (toggle) {
                    inputEvent.preventDefault();
                    toggle.click();
                }
                if (inputEvent.shiftKey && ['l', 'e', 'r'].includes(key)) {
                    inputEvent.preventDefault();
                    setAlignment(key === 'l' ? 'left' : key === 'e' ? 'center' : 'right');
                }
            }
            if (inputEvent.key === 'Enter' && (inputEvent.metaKey || inputEvent.ctrlKey)) finish(true);
            if (inputEvent.key !== 'Escape') inputEvent.stopPropagation();
        });
        saveButton.addEventListener('click', () => finish(true));
        cancelButton.addEventListener('click', () => finish(false));
        input.focus();
        input.select();
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
        Object.assign(annotation, this.getTextStyle(annotation));
        const element = document.createElement('div');
        element.className = 'video-drawing-text-annotation';
        element.setAttribute('role', 'note');
        element.tabIndex = 0;

        const drawerName = String(VideoDrawingOverlay.resolveDrawerName?.(annotation.drawerId) || 'Participant').trim();

        const text = document.createElement('span');
        text.className = 'video-drawing-text-content';
        text.textContent = annotation.text;
        element.appendChild(text);
        annotation.element = element;
        this.applyTextAnnotationStyle(annotation);
        element.classList.toggle('video-drawing-text-select-mode', this.tool === 'select');

        const author = document.createElement('span');
        author.className = 'video-drawing-text-author';
        const authorLabel = 'Annotated by';
        const authorLabelNode = document.createTextNode(window.i18n?.t(authorLabel, 'labels') || authorLabel);
        authorLabelNode.__i18nSrc = authorLabel;
        author.append(authorLabelNode, document.createTextNode(` ${drawerName}`));
        element.appendChild(author);

        this.textAnnotations.set(annotation.annotationId, annotation);
        this.screenWrap.appendChild(element);

        if (this.ownsAnnotation(annotation)) {
            element.classList.add('video-drawing-text-manageable');
            const editButton = document.createElement('button');
            editButton.type = 'button';
            editButton.className = 'video-drawing-text-edit fas fa-pen';
            const editLabel = 'Edit text annotation';
            editButton['__i18nAttr_aria-label'] = editLabel;
            editButton.setAttribute('aria-label', window.i18n?.t(editLabel, 'buttons') || editLabel);
            editButton.addEventListener('click', (event) => {
                event.stopPropagation();
                this.beginTextInput(event, annotation);
            });
            element.appendChild(editButton);

            const duplicateButton = document.createElement('button');
            duplicateButton.type = 'button';
            duplicateButton.className = 'video-drawing-text-duplicate fas fa-copy';
            const duplicateLabel = 'Duplicate text annotation';
            duplicateButton['__i18nAttr_aria-label'] = duplicateLabel;
            duplicateButton.setAttribute('aria-label', window.i18n?.t(duplicateLabel, 'buttons') || duplicateLabel);
            duplicateButton.addEventListener('click', (event) => {
                event.stopPropagation();
                this.duplicateTextAnnotation(annotation);
            });
            element.appendChild(duplicateButton);

            const deleteButton = document.createElement('button');
            deleteButton.type = 'button';
            deleteButton.className = 'video-drawing-text-delete fas fa-times';
            const deleteLabel = 'Delete text annotation';
            deleteButton['__i18nAttr_aria-label'] = deleteLabel;
            deleteButton.setAttribute('aria-label', window.i18n?.t(deleteLabel, 'buttons') || deleteLabel);
            deleteButton.addEventListener('click', (event) => {
                event.stopPropagation();
                this.deleteTextAnnotationWithHistory(annotation);
            });
            element.appendChild(deleteButton);
            element.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                this.beginTextInput(event, annotation);
            });
            this.bindTextDrag(annotation);
        }

        this.positionTextAnnotation(annotation);
    }

    canManageTextAnnotation(annotation) {
        return this.canManageAnnotation(annotation);
    }

    ownsAnnotation(annotation) {
        const localDrawerId = VideoDrawingOverlay.getLocalDrawerId?.();
        return localDrawerId === annotation.drawerId || localDrawerId === this.screenOwnerId;
    }

    bindTextDrag(annotation) {
        const { element } = annotation;
        let drag = null;
        element.__cancelDrag = () => {
            if (!drag) return;
            annotation.x = drag.originalX;
            annotation.y = drag.originalY;
            drag = null;
            element.classList.remove('video-drawing-text-dragging');
            this.positionTextAnnotation(annotation);
        };
        element.addEventListener('pointerdown', (event) => {
            if (!this.canManageTextAnnotation(annotation) || event.target.closest('button') || event.button > 0) return;
            event.preventDefault();
            if (this.tool === 'select') this.selectTextAnnotation(annotation.annotationId);
            element.focus({ preventScroll: true });
            const rect = element.getBoundingClientRect();
            drag = {
                pointerId: event.pointerId,
                offsetX: event.clientX - rect.left,
                offsetY: event.clientY - rect.top,
                originalX: annotation.x,
                originalY: annotation.y,
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
            const { originalX, originalY } = drag;
            drag = null;
            element.classList.remove('video-drawing-text-dragging');
            if (originalX === annotation.x && originalY === annotation.y) return;
            this.recordHistory(
                [{ type: 'text', action: 'move', annotationId: annotation.annotationId, x: originalX, y: originalY }],
                [
                    {
                        type: 'text',
                        action: 'move',
                        annotationId: annotation.annotationId,
                        x: annotation.x,
                        y: annotation.y,
                    },
                ]
            );
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

    updateTextAnnotation(annotationId, data) {
        const annotation = this.textAnnotations.get(annotationId);
        if (!annotation) return;
        annotation.text = data.text;
        Object.assign(annotation, this.getTextStyle(data));
        annotation.element.querySelector('.video-drawing-text-content').textContent = data.text;
        this.applyTextAnnotationStyle(annotation);
        this.positionTextAnnotation(annotation);
    }

    getTextStyle(source = {}) {
        const validColor = typeof source.color === 'string' && /^#[0-9a-f]{6}$/i.test(source.color);
        const fontSize = [12, 16, 20, 24, 32].includes(Number(source.fontSize)) ? Number(source.fontSize) : 16;
        const boxWidth = Number.isFinite(Number(source.boxWidth)) ? Number(source.boxWidth) : 0.35;
        return {
            color: validColor ? source.color : '#ffffff',
            fontSize,
            bold: source.bold === true,
            italic: source.italic === true,
            underline: source.underline === true,
            strikethrough: source.strikethrough === true,
            textAlign: ['left', 'center', 'right'].includes(source.textAlign) ? source.textAlign : 'left',
            backgroundColor:
                source.backgroundColor === 'transparent' ||
                (typeof source.backgroundColor === 'string' && /^#[0-9a-f]{6}$/i.test(source.backgroundColor))
                    ? source.backgroundColor
                    : 'transparent',
            rotation: [-45, -30, -15, 0, 15, 30, 45].includes(Number(source.rotation)) ? Number(source.rotation) : 0,
            boxWidth: Math.max(0.15, Math.min(0.8, boxWidth)),
        };
    }

    applyTextAnnotationStyle(annotation) {
        const { element } = annotation;
        element.style.setProperty('--video-drawing-text-color', annotation.color);
        element.style.setProperty('--video-drawing-text-background', annotation.backgroundColor);
        element.style.setProperty('--video-drawing-text-size', annotation.fontSize);
        element.style.textAlign = annotation.textAlign;
        element.style.transform = `rotate(${annotation.rotation}deg)`;
        element.classList.toggle('video-drawing-text-bold', annotation.bold);
        element.classList.toggle('video-drawing-text-italic', annotation.italic);
        element.classList.toggle('video-drawing-text-underline', annotation.underline);
        element.classList.toggle('video-drawing-text-strikethrough', annotation.strikethrough);
        element.classList.toggle('video-drawing-text-has-background', annotation.backgroundColor !== 'transparent');
    }

    duplicateTextAnnotation(annotation) {
        if (!this.canManageTextAnnotation(annotation)) return;
        const duplicate = {
            ...this.cloneTextAnnotation(annotation),
            annotationId: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            drawerId: VideoDrawingOverlay.getLocalDrawerId?.(),
            x: Math.min(0.95, annotation.x + 0.02),
            y: Math.min(0.95, annotation.y + 0.02),
        };
        this.addTextAnnotation(duplicate);
        this.recordHistory(
            [{ type: 'text', action: 'delete', annotationId: duplicate.annotationId }],
            [{ type: 'text', action: 'create', annotation: this.cloneTextAnnotation(duplicate) }]
        );
        VideoDrawingOverlay.onEmitDrawing?.({
            type: 'text',
            action: 'create',
            screenOwnerId: this.screenOwnerId,
            ...this.cloneTextAnnotation(duplicate),
        });
    }

    deleteTextAnnotationWithHistory(annotation) {
        if (!this.canManageTextAnnotation(annotation)) return;
        const snapshot = this.cloneTextAnnotation(annotation);
        this.deleteTextAnnotation(annotation.annotationId);
        this.recordHistory(
            [{ type: 'text', action: 'create', annotation: snapshot }],
            [{ type: 'text', action: 'delete', annotationId: annotation.annotationId }]
        );
        VideoDrawingOverlay.onEmitDrawing?.({
            type: 'text',
            action: 'delete',
            screenOwnerId: this.screenOwnerId,
            annotationId: annotation.annotationId,
        });
    }

    deleteTextAnnotation(annotationId) {
        const annotation = this.textAnnotations.get(annotationId);
        if (!annotation) return;
        annotation.element.remove();
        this.textAnnotations.delete(annotationId);
        if (this.selectedTextAnnotationId === annotationId) this.selectTextAnnotation(null);
    }

    clearTextAnnotations() {
        for (const annotation of this.textAnnotations.values()) annotation.element.remove();
        this.textAnnotations.clear();
        if (this.selectedTextAnnotationId) this.selectTextAnnotation(null);
    }

    positionTextAnnotations() {
        for (const annotation of this.textAnnotations.values()) this.positionTextAnnotation(annotation);
    }

    positionTextAnnotation(annotation) {
        const canvasWidth = this.canvas.clientWidth;
        const canvasHeight = this.canvas.clientHeight;
        const annotationScale = Math.max(0.5, Math.min(1, canvasWidth / 640, canvasHeight / 360));
        annotation.element.style.setProperty('--video-drawing-annotation-scale', annotationScale);
        annotation.element.style.fontSize = `${annotation.fontSize * annotationScale}px`;
        annotation.element.style.width = 'max-content';
        annotation.element.style.maxWidth = `${Math.max(80, Math.min(annotation.boxWidth * canvasWidth, canvasWidth - 16))}px`;
        const x = Math.min(annotation.x * canvasWidth, Math.max(0, canvasWidth - annotation.element.offsetWidth));
        const y = Math.min(annotation.y * canvasHeight, Math.max(0, canvasHeight - annotation.element.offsetHeight));
        annotation.element.classList.toggle('video-drawing-text-author-below', annotation.y < 0.15);
        annotation.element.classList.toggle('video-drawing-text-author-align-right', annotation.x > 0.6);
        annotation.element.style.left = `${this.canvas.offsetLeft + x}px`;
        annotation.element.style.top = `${this.canvas.offsetTop + y}px`;
    }

    receiveText(data) {
        if (data.action === 'move') this.moveTextAnnotation(data.annotationId, data.x, data.y);
        else if (data.action === 'update') this.updateTextAnnotation(data.annotationId, data);
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
        return this.canInteract() && this.ownsAnnotation(annotation);
    }

    findAnnotationAtPoint(point, filter = () => true) {
        const rect = { width: this.canvas.clientWidth, height: this.canvas.clientHeight };
        return [...this.annotations.values()].reverse().find((annotation) => {
            if (!filter(annotation)) return false;
            if (!annotation.points?.length) return false;
            const pointX = point.x * rect.width;
            const pointY = point.y * rect.height;
            const tolerance = Math.max(10, annotation.width * rect.width);
            const pixels = annotation.points.map(({ x, y }) => ({ x: x * rect.width, y: y * rect.height }));
            if (annotation.tool === 'circle' && pixels.length >= 2) {
                const radius = Math.hypot(pixels[1].x - pixels[0].x, pixels[1].y - pixels[0].y);
                return Math.hypot(pointX - pixels[0].x, pointY - pixels[0].y) <= radius + tolerance;
            }
            if (annotation.tool === 'diamond' && pixels.length >= 2) {
                const centerX = (pixels[0].x + pixels[1].x) / 2;
                const centerY = (pixels[0].y + pixels[1].y) / 2;
                const radiusX = Math.abs(pixels[1].x - pixels[0].x) / 2;
                const radiusY = Math.abs(pixels[1].y - pixels[0].y) / 2;
                return (
                    Math.abs(pointX - centerX) / (radiusX + tolerance) +
                        Math.abs(pointY - centerY) / (radiusY + tolerance) <=
                    1
                );
            }
            if (annotation.tool === 'rectangle' && pixels.length >= 2) {
                const minX = Math.min(pixels[0].x, pixels[1].x) - tolerance;
                const maxX = Math.max(pixels[0].x, pixels[1].x) + tolerance;
                const minY = Math.min(pixels[0].y, pixels[1].y) - tolerance;
                const maxY = Math.max(pixels[0].y, pixels[1].y) + tolerance;
                return pointX >= minX && pointX <= maxX && pointY >= minY && pointY <= maxY;
            }
            for (let index = 1; index < pixels.length; index++) {
                if (this.distanceToSegment({ x: pointX, y: pointY }, pixels[index - 1], pixels[index]) <= tolerance) {
                    return true;
                }
            }
            return pixels.length === 1 && Math.hypot(pointX - pixels[0].x, pointY - pixels[0].y) <= tolerance;
        });
    }

    distanceToSegment(point, start, end) {
        const deltaX = end.x - start.x;
        const deltaY = end.y - start.y;
        const lengthSquared = deltaX * deltaX + deltaY * deltaY;
        if (!lengthSquared) return Math.hypot(point.x - start.x, point.y - start.y);
        const ratio = Math.max(
            0,
            Math.min(1, ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) / lengthSquared)
        );
        return Math.hypot(point.x - (start.x + ratio * deltaX), point.y - (start.y + ratio * deltaY));
    }

    clonePoints(points) {
        return points.map(({ x, y }) => ({ x, y }));
    }

    cloneAnnotation(annotation) {
        return {
            annotationId: annotation.annotationId,
            drawerId: annotation.drawerId,
            tool: annotation.tool,
            color: annotation.color,
            width: annotation.width,
            points: this.clonePoints(annotation.points),
        };
    }

    cloneTextAnnotation(annotation) {
        return {
            type: 'text',
            annotationId: annotation.annotationId,
            drawerId: annotation.drawerId,
            text: annotation.text,
            x: annotation.x,
            y: annotation.y,
            ...this.getTextStyle(annotation),
        };
    }

    recordHistory(undoCommands, redoCommands) {
        this.undoStack.push({ undoCommands, redoCommands });
        if (this.undoStack.length > 50) this.undoStack.shift();
        this.redoStack = [];
        this.updateHistoryButtons();
    }

    updateHistoryButtons() {
        if (this.undoButton) this.undoButton.disabled = !this.canInteract() || this.undoStack.length === 0;
        if (this.redoButton) this.redoButton.disabled = !this.canInteract() || this.redoStack.length === 0;
    }

    undo() {
        if (!this.canInteract()) return;
        const entry = this.undoStack.pop();
        if (!entry) return;
        for (const command of entry.undoCommands) this.executeHistoryCommand(command);
        this.redoStack.push(entry);
        this.updateHistoryButtons();
    }

    redo() {
        if (!this.canInteract()) return;
        const entry = this.redoStack.pop();
        if (!entry) return;
        for (const command of entry.redoCommands) this.executeHistoryCommand(command);
        this.undoStack.push(entry);
        this.updateHistoryButtons();
    }

    executeHistoryCommand(command) {
        if (command.type === 'text') {
            this.executeTextHistoryCommand(command);
            return;
        }
        if (command.action === 'create') {
            const annotation = this.cloneAnnotation(command.annotation);
            this.receiveAnnotation({ action: 'create', ...annotation });
            const localDrawerId = VideoDrawingOverlay.getLocalDrawerId?.();
            VideoDrawingOverlay.onEmitDrawing?.({
                type: 'annotation',
                action: annotation.drawerId === localDrawerId ? 'create' : 'restore',
                screenOwnerId: this.screenOwnerId,
                ...annotation,
            });
            return;
        }
        if (command.action === 'move') {
            const points = this.clonePoints(command.points);
            this.receiveAnnotation({ action: 'move', annotationId: command.annotationId, points });
            VideoDrawingOverlay.onEmitDrawing?.({
                type: 'annotation',
                action: 'move',
                screenOwnerId: this.screenOwnerId,
                annotationId: command.annotationId,
                points,
            });
            return;
        }
        this.receiveAnnotation({ action: 'delete', annotationId: command.annotationId });
        VideoDrawingOverlay.onEmitDrawing?.({
            type: 'annotation',
            action: 'delete',
            screenOwnerId: this.screenOwnerId,
            annotationId: command.annotationId,
        });
    }

    executeTextHistoryCommand(command) {
        if (command.action === 'create') {
            const annotation = this.cloneTextAnnotation(command.annotation);
            this.receiveText({ action: 'create', ...annotation });
            const localDrawerId = VideoDrawingOverlay.getLocalDrawerId?.();
            VideoDrawingOverlay.onEmitDrawing?.({
                type: 'text',
                action: annotation.drawerId === localDrawerId ? 'create' : 'restore',
                screenOwnerId: this.screenOwnerId,
                ...annotation,
            });
            return;
        }
        if (command.action === 'move') {
            this.receiveText(command);
            VideoDrawingOverlay.onEmitDrawing?.({
                type: 'text',
                action: 'move',
                screenOwnerId: this.screenOwnerId,
                annotationId: command.annotationId,
                x: command.x,
                y: command.y,
            });
            return;
        }
        if (command.action === 'update') {
            this.receiveText(command);
            VideoDrawingOverlay.onEmitDrawing?.({
                type: 'text',
                action: 'update',
                screenOwnerId: this.screenOwnerId,
                ...command,
            });
            return;
        }
        this.receiveText({ action: 'delete', annotationId: command.annotationId });
        VideoDrawingOverlay.onEmitDrawing?.({
            type: 'text',
            action: 'delete',
            screenOwnerId: this.screenOwnerId,
            annotationId: command.annotationId,
        });
    }

    handleHistoryKeyDown(event) {
        if (!this.isActive || !(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== 'z') {
            return;
        }
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
        event.preventDefault();
        if (event.shiftKey) this.redo();
        else this.undo();
    }

    selectAnnotation(annotationId) {
        this.selectedTextAnnotationId = null;
        for (const textAnnotation of this.textAnnotations.values()) {
            textAnnotation.element.classList.remove('video-drawing-text-selected');
        }
        this.selectedAnnotationId = annotationId;
        const annotation = annotationId ? this.annotations.get(annotationId) : null;
        if (this.deleteButton) this.deleteButton.disabled = !annotation || !this.canManageAnnotation(annotation);
        this.render();
    }

    selectTextAnnotation(annotationId) {
        this.selectedAnnotationId = null;
        this.selectedTextAnnotationId = annotationId;
        const annotation = annotationId ? this.textAnnotations.get(annotationId) : null;
        for (const textAnnotation of this.textAnnotations.values()) {
            textAnnotation.element.classList.toggle(
                'video-drawing-text-selected',
                textAnnotation.annotationId === annotationId
            );
        }
        if (this.deleteButton) this.deleteButton.disabled = !annotation || !this.canManageTextAnnotation(annotation);
        this.render();
    }

    deleteSelectedAnnotation() {
        const textAnnotation = this.textAnnotations.get(this.selectedTextAnnotationId);
        if (textAnnotation && this.canManageTextAnnotation(textAnnotation)) {
            this.deleteTextAnnotationWithHistory(textAnnotation);
            return;
        }
        const annotation = this.annotations.get(this.selectedAnnotationId);
        if (!annotation || !this.canManageAnnotation(annotation)) return;
        const snapshot = this.cloneAnnotation(annotation);
        this.clearDrawerNameTimer(annotation.annotationId);
        this.annotations.delete(annotation.annotationId);
        this.selectAnnotation(null);
        VideoDrawingOverlay.onEmitDrawing?.({
            type: 'annotation',
            action: 'delete',
            screenOwnerId: this.screenOwnerId,
            annotationId: annotation.annotationId,
        });
        this.recordHistory(
            [{ action: 'create', annotation: snapshot }],
            [{ action: 'delete', annotationId: annotation.annotationId }]
        );
    }

    clearAnnotations(emit, drawerId, forceClearAll = false) {
        if (emit && !this.canInteract()) return;
        const localDrawerId = VideoDrawingOverlay.getLocalDrawerId?.();
        const clearAll = forceClearAll || (emit && localDrawerId === this.screenOwnerId);
        const targetDrawerId = drawerId || localDrawerId;
        const removedAnnotations = [];
        const removedTextAnnotations = [];
        for (const [annotationId, annotation] of this.annotations) {
            if (clearAll || annotation.drawerId === targetDrawerId) {
                if (emit) removedAnnotations.push(this.cloneAnnotation(annotation));
                this.clearDrawerNameTimer(annotationId);
                this.annotations.delete(annotationId);
            }
        }
        for (const [annotationId, annotation] of this.textAnnotations) {
            if (clearAll || annotation.drawerId === targetDrawerId) {
                if (emit) removedTextAnnotations.push(this.cloneTextAnnotation(annotation));
                annotation.element.remove();
                this.textAnnotations.delete(annotationId);
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
            if (clearAll) {
                VideoDrawingOverlay.onEmitDrawing?.({
                    type: 'text',
                    action: 'clear',
                    screenOwnerId: this.screenOwnerId,
                });
            } else {
                for (const annotation of removedTextAnnotations) {
                    VideoDrawingOverlay.onEmitDrawing?.({
                        type: 'text',
                        action: 'delete',
                        screenOwnerId: this.screenOwnerId,
                        annotationId: annotation.annotationId,
                    });
                }
            }
            if (removedAnnotations.length || removedTextAnnotations.length) {
                this.recordHistory(
                    [
                        ...removedAnnotations.map((annotation) => ({ action: 'create', annotation })),
                        ...removedTextAnnotations.map((annotation) => ({ type: 'text', action: 'create', annotation })),
                    ],
                    [
                        ...removedAnnotations.map(({ annotationId }) => ({ action: 'delete', annotationId })),
                        ...removedTextAnnotations.map(({ annotationId }) => ({
                            type: 'text',
                            action: 'delete',
                            annotationId,
                        })),
                    ]
                );
            }
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

    async captureSnapshot() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        if (this.video.readyState < 2 || !this.video.videoWidth || !this.video.videoHeight || !width || !height) {
            throw new Error('No screen video frame is available');
        }
        const snapshot = document.createElement('canvas');
        snapshot.width = this.video.videoWidth;
        snapshot.height = this.video.videoHeight;
        const context = snapshot.getContext('2d');
        context.drawImage(this.video, 0, 0, snapshot.width, snapshot.height);
        if (this.annotationsHidden) return snapshot;
        try {
            this.render(false);
            context.drawImage(this.canvas, 0, 0, snapshot.width, snapshot.height);
        } finally {
            this.render();
        }
        if (!this.textAnnotations.size) return snapshot;
        if (typeof window.html2canvas !== 'function') throw new Error('Screen capture library is unavailable');

        const frame = document.createElement('div');
        Object.assign(frame.style, {
            position: 'absolute',
            left: '-100000px',
            top: '0',
            width: `${width}px`,
            height: `${height}px`,
            overflow: 'hidden',
            pointerEvents: 'none',
            fontFamily: getComputedStyle(this.screenWrap).fontFamily,
        });
        frame.setAttribute('aria-hidden', 'true');
        Object.assign(snapshot.style, { width: `${width}px`, height: `${height}px`, display: 'block' });
        frame.appendChild(snapshot);
        for (const { element } of this.textAnnotations.values()) {
            const clone = element.cloneNode(true);
            clone.classList.remove('video-drawing-text-selected', 'video-drawing-text-select-mode');
            clone.querySelectorAll('button, .video-drawing-text-author').forEach((control) => control.remove());
            Object.assign(clone.style, {
                left: `${element.offsetLeft - this.canvas.offsetLeft}px`,
                top: `${element.offsetTop - this.canvas.offsetTop}px`,
                width: `${element.offsetWidth}px`,
                height: `${element.offsetHeight}px`,
                borderColor: 'transparent',
                boxShadow: 'none',
            });
            frame.appendChild(clone);
        }
        document.body.appendChild(frame);
        try {
            return await window.html2canvas(frame, {
                backgroundColor: null,
                scale: snapshot.width / width,
                width,
                height,
                logging: false,
            });
        } finally {
            frame.remove();
        }
    }

    async downloadSnapshot(format) {
        if (this.isCapturing) return;
        this.isCapturing = true;
        this.downloadButtons.forEach((button) => (button.disabled = true));
        try {
            const snapshot = await this.captureSnapshot();
            const fileName = `screen-annotations-${new Date().toISOString().replace(/[:.]/g, '-')}`;
            if (format === 'pdf') {
                if (!window.jspdf?.jsPDF) throw new Error('PDF library is unavailable');
                const pdf = new window.jspdf.jsPDF({
                    orientation: snapshot.width >= snapshot.height ? 'landscape' : 'portrait',
                    unit: 'px',
                    format: [snapshot.width, snapshot.height],
                    hotfixes: ['px_scaling'],
                });
                pdf.addImage(snapshot, 'PNG', 0, 0, snapshot.width, snapshot.height);
                pdf.save(`${fileName}.pdf`);
            } else {
                const blob = await new Promise((resolve) => snapshot.toBlob(resolve, 'image/png'));
                if (!blob) throw new Error('Screen image could not be encoded');
                saveBlobToFile(blob, `${fileName}.png`);
            }
        } catch (error) {
            console.error('Screen annotation capture failed', error);
            if (typeof userLog === 'function') userLog('error', 'Unable to download screen annotations');
        } finally {
            this.isCapturing = false;
            this.downloadButtons.forEach((button) => (button.disabled = false));
        }
    }

    render(showDetails = true) {
        const rect = { width: this.canvas.clientWidth, height: this.canvas.clientHeight };
        this.context.clearRect(0, 0, rect.width, rect.height);
        if (this.annotationsHidden) return;
        for (const annotation of this.annotations.values()) this.renderAnnotation(annotation, rect, showDetails);
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
        for (const stroke of showDetails ? latestStrokesByDrawer.values() : []) {
            this.renderDrawerName(stroke, rect);
        }
        for (const pointer of showDetails ? this.laserPointers.values() : []) {
            const point = pointer.points[0];
            this.context.save();
            this.context.beginPath();
            this.context.fillStyle = VideoDrawingOverlay.LASER_COLOR;
            this.context.shadowColor = VideoDrawingOverlay.LASER_COLOR;
            this.context.shadowBlur = 12;
            this.context.arc(point.x * rect.width, point.y * rect.height, 5, 0, Math.PI * 2);
            this.context.fill();
            this.context.shadowBlur = 0;
            this.context.strokeStyle = '#ffffff';
            this.context.lineWidth = 1.5;
            this.context.stroke();
            this.context.restore();
            this.renderDrawerName(pointer, rect);
        }
    }

    renderAnnotation(annotation, rect, showDetails = true) {
        if (!annotation.points?.length) return;
        const start = annotation.points[0];
        this.context.save();
        this.context.beginPath();
        this.context.strokeStyle = annotation.tool === 'highlighter' ? `${annotation.color}59` : annotation.color;
        this.context.lineWidth = Math.max(2, annotation.width * rect.width);
        this.context.lineCap = 'round';
        this.context.lineJoin = 'round';
        if (annotation.tool === 'circle') {
            const end = annotation.points[1] || start;
            const startX = start.x * rect.width;
            const startY = start.y * rect.height;
            const radius = Math.hypot(end.x * rect.width - startX, end.y * rect.height - startY);
            this.context.arc(startX, startY, radius, 0, Math.PI * 2);
        } else if (annotation.tool === 'rectangle') {
            const end = annotation.points[1] || start;
            this.context.rect(
                start.x * rect.width,
                start.y * rect.height,
                (end.x - start.x) * rect.width,
                (end.y - start.y) * rect.height
            );
        } else if (annotation.tool === 'diamond') {
            const end = annotation.points[1] || start;
            const centerX = ((start.x + end.x) / 2) * rect.width;
            const centerY = ((start.y + end.y) / 2) * rect.height;
            this.context.moveTo(centerX, start.y * rect.height);
            this.context.lineTo(end.x * rect.width, centerY);
            this.context.lineTo(centerX, end.y * rect.height);
            this.context.lineTo(start.x * rect.width, centerY);
            this.context.closePath();
        } else if (annotation.tool === 'arrow') {
            const end = annotation.points[1] || start;
            const startX = start.x * rect.width;
            const startY = start.y * rect.height;
            const endX = end.x * rect.width;
            const endY = end.y * rect.height;
            const angle = Math.atan2(endY - startY, endX - startX);
            const headLength = Math.max(12, Math.min(24, Math.hypot(endX - startX, endY - startY) * 0.25));
            this.context.moveTo(startX, startY);
            this.context.lineTo(endX, endY);
            this.context.moveTo(endX, endY);
            this.context.lineTo(
                endX - headLength * Math.cos(angle - Math.PI / 6),
                endY - headLength * Math.sin(angle - Math.PI / 6)
            );
            this.context.moveTo(endX, endY);
            this.context.lineTo(
                endX - headLength * Math.cos(angle + Math.PI / 6),
                endY - headLength * Math.sin(angle + Math.PI / 6)
            );
        } else {
            this.context.moveTo(start.x * rect.width, start.y * rect.height);
            for (const point of annotation.points.slice(1)) {
                this.context.lineTo(point.x * rect.width, point.y * rect.height);
            }
        }
        this.context.stroke();
        this.context.restore();
        if (showDetails && annotation.annotationId === this.selectedAnnotationId) {
            this.renderAnnotationSelection(annotation, rect);
        }
        if (showDetails && annotation.showDrawerName) this.renderDrawerName(annotation, rect);
    }

    renderAnnotationSelection(annotation, rect) {
        if (!annotation.points.length) return;
        const pointXs = annotation.points.map(({ x }) => x * rect.width);
        const pointYs = annotation.points.map(({ y }) => y * rect.height);
        if (annotation.tool === 'circle') {
            const centerX = pointXs[0];
            const centerY = pointYs[0];
            const radius = Math.hypot((pointXs[1] ?? centerX) - centerX, (pointYs[1] ?? centerY) - centerY);
            pointXs.push(centerX - radius, centerX + radius);
            pointYs.push(centerY - radius, centerY + radius);
        }
        const padding = 5;
        const minX = Math.min(...pointXs) - padding;
        const minY = Math.min(...pointYs) - padding;
        const width = Math.max(10, Math.max(...pointXs) - Math.min(...pointXs) + padding * 2);
        const height = Math.max(10, Math.max(...pointYs) - Math.min(...pointYs) + padding * 2);
        this.context.save();
        this.context.beginPath();
        this.context.setLineDash([6, 4]);
        this.context.strokeStyle = '#4caf50';
        this.context.lineWidth = 2;
        this.context.rect(minX, minY, width, height);
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
        this.stopLaser();
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
        for (const timer of this.laserTimers.values()) clearTimeout(timer);
        this.laserTimers.clear();
        this.laserPointers.clear();
        this.resizeObserver.disconnect();
        document.removeEventListener('keydown', this.handleHistoryKeyDown);
        document.removeEventListener('pointerdown', this.handleToolbarOutsidePointer);
        this.textInput?.remove();
        this.clearTextAnnotations();
        this.annotations.clear();
        for (const control of this.toolbar?.querySelectorAll('button, input') || []) control._tippy?.destroy();
        this.toolbar?.remove();
        this.canvas.remove();
        VideoDrawingOverlay.pendingTextEvents.delete(this.screenOwnerId);
        VideoDrawingOverlay.pendingAnnotationEvents.delete(this.screenOwnerId);
        VideoDrawingOverlay.pendingPermissions.delete(this.screenOwnerId);
        VideoDrawingOverlay.overlays.delete(this.screenOwnerId);
    }

    static getOrCreate(screenOwnerId, screenWrap, video) {
        return this.overlays.get(screenOwnerId) || new VideoDrawingOverlay(screenOwnerId, screenWrap, video);
    }

    static receive(data) {
        const overlay = data && this.overlays.get(data.screenOwnerId);
        if (data?.type === 'permissions') {
            if (overlay) overlay.setParticipantsAllowed(data.allowed);
            else if (typeof data.allowed === 'boolean') this.pendingPermissions.set(data.screenOwnerId, data.allowed);
            return;
        }
        if (data?.type === 'laser') {
            overlay?.receiveLaser(data);
            return;
        }
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
        this.pendingPermissions.delete(screenOwnerId);
        this.pendingTextEvents.delete(screenOwnerId);
        this.pendingAnnotationEvents.delete(screenOwnerId);
        this.overlays.get(screenOwnerId)?.destroy();
    }
}
