class DropZoneBinder {
    constructor(options = {}) {
        this.eventRegistry = options.eventRegistry || null;
    }

    addEvent(element, type, handler, useEventRegistry = true) {
        if (!element || !handler) return;
        if (useEventRegistry && this.eventRegistry && this.eventRegistry.add) {
            this.eventRegistry.add(element, type, handler);
        } else if (element.addEventListener) {
            element.addEventListener(type, handler);
        }
    }

    bind(element, onDrop, options = {}) {
        if (!element || !onDrop) return;
        const dragClass = options.dragClass || 'drag-over';
        const canAccept = options.canAccept || (() => true);
        const useEventRegistry = options.useEventRegistry !== false;

        this.addEvent(element, 'dragover', (event) => {
            if (!canAccept(event)) return;
            event.preventDefault();
            element.classList.add(dragClass);
        }, useEventRegistry);

        this.addEvent(element, 'dragleave', () => {
            element.classList.remove(dragClass);
        }, useEventRegistry);

        this.addEvent(element, 'drop', (event) => {
            if (!canAccept(event)) return;
            event.preventDefault();
            if (options.stopPropagation !== false) event.stopPropagation();
            element.classList.remove(dragClass);
            onDrop(event);
        }, useEventRegistry);
    }
}

if (typeof window !== 'undefined') {
    window.DropZoneBinder = DropZoneBinder;
}
