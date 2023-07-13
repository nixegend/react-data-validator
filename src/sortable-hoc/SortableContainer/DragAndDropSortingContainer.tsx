import { useCallback, useRef } from 'react';

import { DraggableSortableNode } from '@/sortable-hoc/getDraggableSortableNode';
import { DragAndDropSortingContext } from '@/sortable-hoc/SortableContainer/drag-and-drop-sorting-context';
import { getNestedScrollOffsets } from '@/sortable-hoc/SortableContainer/scroll/getNestedScrollOffsets';
import { getScrollableAncestors } from '@/sortable-hoc/SortableContainer/scroll/getScrollableAncestors';
import { useAutoScroller } from '@/sortable-hoc/SortableContainer/scroll/useAutoScroller';
import { Coordinates } from '@/sortable-hoc/types';
import { getEventCoordinates, getNestedNodeOffset } from '@/sortable-hoc/utils';

type PropsTypes = {
  axis: keyof Coordinates;
  className?: string;
  children: React.ReactNode | React.ReactNode[] | null;
  onSortDropChange: (fromIndex: number, toIndex: number) => void;
};

type DragAndDropSortableState = {
  activeNode: DraggableSortableNode | null;
  containerRect: DOMRect | null;
  deltaRects: Coordinates;
  initPosition: Coordinates;
  deltaPosition: Coordinates;
  initRelatedContainerPosition: Coordinates;
  initContainerScroll: Coordinates;
  initContainerNestedScroll: Coordinates;
  initNodeNestedScroll: Coordinates;
  initNestedNodeOffsets: Coordinates;
  entries: Array<DraggableSortableNode>;
};

export default function DragAndDropSortingContainer({
  axis,
  className,
  children,
  onSortDropChange
}: PropsTypes) {
  const sort = useRef<DragAndDropSortableState>({
    activeNode: null,
    containerRect: null,
    initRelatedContainerPosition: { x: 0, y: 0 },
    initContainerNestedScroll: { x: 0, y: 0 },
    initNestedNodeOffsets: { x: 0, y: 0 },
    initContainerScroll: { x: 0, y: 0 },
    initNodeNestedScroll: { x: 0, y: 0 },
    initPosition: { x: 0, y: 0 },
    deltaPosition: { x: 0, y: 0 },
    deltaRects: { x: 0, y: 0 },
    entries: []
  });

  const registerSortableNode = useCallback((node: DraggableSortableNode) => {
    sort.current.entries.push(node);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unRegisterSortableNode = useCallback((index: number) => {
    sort.current.entries.splice(index, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reGroupPositionsOfNodes = () => {
    console.log('STOP SCROLLING');
  };

  const [dndSortingContainer, updateScroll, clearAutoScrollInterval] = useAutoScroller(
    reGroupPositionsOfNodes,
    {
      axis,
      interval: 5,
      threshold: 0.45,
      minSpeed: 2,
      maxSpeed: 10
    }
  );

  const onDrag = (event: MouseEvent) => {
    if (typeof event.preventDefault === 'function' && event.cancelable) {
      event.preventDefault();
    }

    const meta = sort.current;

    if (meta.activeNode && meta.containerRect && meta.initContainerScroll) {
      meta.activeNode.setActiveState(true);

      const pos = getEventCoordinates(event);

      meta.deltaPosition[axis] = pos[axis] - meta.initPosition[axis];

      const gap = 30;

      const translate =
        meta.deltaPosition[axis] +
        meta.initNestedNodeOffsets[axis] -
        gap -
        meta.initNodeNestedScroll[axis];

      // const translate = meta.deltaPosition.y + meta.initNestedNodeOffsets.y - gap - meta.initNodeNestedScroll.y;

      meta.activeNode.setHelperPosition({ x: 0, y: translate });

      updateScroll(meta.deltaPosition, meta.initRelatedContainerPosition);
    }

    //  translate.y -= window.scrollY - this.initialWindowScroll.top;
    //  translate.x -= window.scrollX - this.initialWindowScroll.left;
  };

  const onDrop = (event: MouseEvent) => {
    clearAutoScrollInterval();

    const meta = sort.current;
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', onDrop);

    if (meta.activeNode) {
      meta.activeNode.setActiveState(false);
      meta.activeNode = null;
    }
  };

  const reRange = (container: HTMLElement) => {
    const meta = sort.current;
    const result = meta.deltaPosition.y + meta.deltaRects.y - meta.initNodeNestedScroll.y;
    // const result = meta.deltaPosition.y + meta.initNestedNodeOffsets.y - gap - meta.initNodeNestedScroll.y;
    console.clear();
    console.table({
      initContainerNestedScroll: meta.initContainerNestedScroll.y,
      initNodeNestedScroll: meta.initNodeNestedScroll.y,
      initContainerScroll: meta.initContainerScroll.y,
      deltaPosition: meta.deltaPosition.y,
      initNestedNodeOffsets: meta.initNestedNodeOffsets.y,
      deltaRects: meta.deltaRects.y,
      containerRect: meta.containerRect?.y,
      activeNode: meta.activeNode?.initPosition.y,
      result
    });
    console.log(meta.entries);
  };

  const onStartDrag = useCallback(
    (
      event: MouseEvent | TouchEvent,
      node: DraggableSortableNode,
      originNode: React.MutableRefObject<HTMLElement | null>
    ) => {
      const meta = sort.current;

      meta.activeNode = node;
      meta.initPosition = getEventCoordinates(event);
      document.addEventListener('mousemove', onDrag, { passive: false });
      document.addEventListener('mouseup', onDrop);

      meta.initNestedNodeOffsets = getNestedNodeOffset(
        originNode.current,
        dndSortingContainer.current
      );

      const scrollableNodeAncestors = getScrollableAncestors(originNode.current);
      meta.initNodeNestedScroll = getNestedScrollOffsets(scrollableNodeAncestors);

      const scrollableContainerAncestors = getScrollableAncestors(dndSortingContainer.current);
      meta.initContainerNestedScroll = getNestedScrollOffsets(scrollableContainerAncestors);

      if (dndSortingContainer.current) {
        meta.containerRect = dndSortingContainer.current.getBoundingClientRect();

        meta.initRelatedContainerPosition[axis] =
          meta.initPosition[axis] - meta.containerRect[axis];

        meta.initContainerScroll = {
          x: dndSortingContainer.current.scrollLeft,
          y: dndSortingContainer.current.scrollTop
        };

        meta.deltaRects[axis] = meta.activeNode.initPosition[axis] - meta.containerRect[axis];

        reRange(dndSortingContainer.current);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <DragAndDropSortingContext.Provider
      value={{
        registerSortableNode,
        unRegisterSortableNode,
        onStartDrag
      }}
    >
      <div ref={dndSortingContainer} className={className ? 'dnd-area ' + className : 'dnd-area'}>
        {children}
      </div>
    </DragAndDropSortingContext.Provider>
  );
}

//   // Adding a non-capture and non-passive `touchmove` listener in order
//   // to force `event.preventDefault()` calls to work in dynamically added
//   // touchmove event handlers. This is required for iOS Safari.
//   // window.addEventListener(events.move.name, noop, {
//   //   capture: false,
//   //   passive: false,
//   // });
