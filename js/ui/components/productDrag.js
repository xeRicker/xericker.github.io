export function setupProductDrag(container, handlers) {
    let draggedProductId = null;
    let draggedCategoryId = null;
    let draggedElement = null;

    const clearDropTargets = () => {
        container.querySelectorAll('.is-drop-target, .is-drop-before, .is-drop-after').forEach(node => {
            node.classList.remove('is-drop-target', 'is-drop-before', 'is-drop-after');
        });
    };

    const clearDragState = () => {
        draggedElement?.classList.remove('is-dragging');
        draggedElement = null;
        draggedProductId = null;
        draggedCategoryId = null;
        clearDropTargets();
    };

    const markDropTarget = list => {
        if (list.classList.contains('is-drop-target')) return;
        clearDropTargets();
        list.classList.add('is-drop-target');
    };

    const markInsertRow = (list, clientY) => {
        const row = container.querySelector(`[data-product-id="${draggedProductId}"]`);
        const hovered = Array.from(list.querySelectorAll('.admin-product-row')).find(node => {
            const rect = node.getBoundingClientRect();
            return clientY >= rect.top && clientY <= rect.bottom;
        });
        if (!hovered || hovered === row) return;

        const placeBefore = clientY < hovered.getBoundingClientRect().top + hovered.offsetHeight / 2;
        if (placeBefore === hovered.classList.contains('is-drop-before')) return;
        list.querySelectorAll('.is-drop-before, .is-drop-after').forEach(node => node.classList.remove('is-drop-before', 'is-drop-after'));
        hovered.classList.add(placeBefore ? 'is-drop-before' : 'is-drop-after');
    };

    const handleDragStart = event => {
        const handle = event.target.closest('[data-category-drag]');
        const productRow = handle ? null : event.target.closest('.admin-product-row');
        const card = handle ? handle.closest('.admin-category-card') : productRow?.closest('.admin-category-card');
        if (!card) return;

        draggedElement = productRow || card;
        draggedCategoryId = handle ? card.dataset.categoryId : null;
        draggedProductId = productRow?.dataset.productId || null;
        draggedElement.classList.add('is-dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', draggedProductId || draggedCategoryId || '');
    };

    const trackProductDrop = event => {
        const list = event.target.closest('.admin-product-list');
        if (!list) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        markDropTarget(list);
        markInsertRow(list, event.clientY);
    };

    const dropProduct = event => {
        const list = event.target.closest('.admin-product-list');
        if (!list) return;
        event.preventDefault();

        const row = container.querySelector(`[data-product-id="${draggedProductId}"]`);
        if (!row) return;

        const referenceRow = event.target.closest('.admin-product-row');
        if (referenceRow && referenceRow !== row) {
            const rect = referenceRow.getBoundingClientRect();
            if (event.clientY < rect.top + rect.height / 2) referenceRow.before(row);
            else referenceRow.after(row);
        } else if (!referenceRow) {
            list.appendChild(row);
        }

        handlers.onProductsDropped(draggedProductId, list.dataset.categoryId);
        clearDragState();
    };

    const trackCategoryDrop = event => {
        const card = event.target.closest('.admin-category-card');
        if (!card || card === draggedElement) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        const placeBefore = event.clientX < card.getBoundingClientRect().left + card.offsetWidth / 2;
        card.classList.toggle('is-drop-before', placeBefore);
        if (!card.classList.contains('is-drop-target')) {
            clearDropTargets();
            card.classList.add('is-drop-target');
        }
    };

    const dropCategory = event => {
        const card = event.target.closest('.admin-category-card');
        if (!card) return;
        event.preventDefault();

        const categoryId = draggedCategoryId;
        if (card !== draggedElement) {
            const placeBefore = event.clientX < card.getBoundingClientRect().left + card.offsetWidth / 2;
            if (placeBefore) card.before(draggedElement);
            else card.after(draggedElement);
            handlers.onCategoriesDropped(categoryId);
        }
        clearDragState();
    };

    container.addEventListener('dragstart', handleDragStart);
    container.addEventListener('dragover', event => {
        if (draggedProductId) trackProductDrop(event);
        else if (draggedCategoryId) trackCategoryDrop(event);
    });
    container.addEventListener('drop', event => {
        if (draggedProductId) dropProduct(event);
        else if (draggedCategoryId) dropCategory(event);
    });
    container.addEventListener('dragend', clearDragState);
}
