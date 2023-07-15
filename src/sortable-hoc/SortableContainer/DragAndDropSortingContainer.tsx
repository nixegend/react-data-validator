import { useCallback, useRef } from 'react';

import { DraggableSortableNode } from '@/sortable-hoc/getDraggableSortableNode';
import { DragAndDropSortingContext } from '@/sortable-hoc/SortableContainer/drag-and-drop-sorting-context';
import { getDelta } from '@/sortable-hoc/SortableContainer/scroll/getDelta';
import { getNestedScrollOffsets } from '@/sortable-hoc/SortableContainer/scroll/getNestedScrollOffsets';
import { getScrollableAncestors } from '@/sortable-hoc/SortableContainer/scroll/getScrollableAncestors';
import { useAutoScroller } from '@/sortable-hoc/SortableContainer/scroll/useAutoScroller';
import useScrollableContainer from '@/sortable-hoc/SortableContainer/scroll/useScrollableContainer';
import { Coordinates } from '@/sortable-hoc/types';
import { getElementMargin, getEventCoordinates, getNestedNodeOffset } from '@/sortable-hoc/utils';

type PropsTypes = {
  axis: keyof Coordinates;
  isScrollableWindow?: boolean;
  children: React.ReactNode | React.ReactNode[] | null;
  onDropChange: (fromIndex: number, toIndex: number) => void;
};

type DragAndDropSortableState = {
  activeNode: DraggableSortableNode | null;
  containerRect: DOMRect | null;
  nodeMargin: Coordinates;
  deltaRects: Coordinates;
  initPosition: Coordinates;
  deltaPosition: Coordinates;
  currentPosition: Coordinates;
  initRelatedContainerPosition: Coordinates;
  initContainerScroll: Coordinates;
  initContainerNestedScroll: Coordinates;
  initNodeNestedScroll: Coordinates;
  initNestedNodeOffsets: Coordinates;
  entries: Array<DraggableSortableNode>;
};

export default function DragAndDropSortingContainer({
  axis,
  children,
  isScrollableWindow = false,
  onDropChange
}: PropsTypes) {
  const [containerDescriptor, onScrollContainer, onSetScrollableContainer] =
    useScrollableContainer(isScrollableWindow);

  const sort = useRef<DragAndDropSortableState>({
    activeNode: null,
    containerRect: null,
    initRelatedContainerPosition: { x: 0, y: 0 },
    initContainerNestedScroll: { x: 0, y: 0 },
    initNestedNodeOffsets: { x: 0, y: 0 },
    initContainerScroll: { x: 0, y: 0 },
    initNodeNestedScroll: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    initPosition: { x: 0, y: 0 },
    deltaPosition: { x: 0, y: 0 },
    deltaRects: { x: 0, y: 0 },
    nodeMargin: { x: 0, y: 0 },
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

  const onStopInteraction = () => {
    console.log('ON STOP SCROLLING / ON STOP DRAGGING');
    const meta = sort.current;

    if (meta.activeNode) {
      const relatedListPosition =
        meta.activeNode.offsets[axis] +
        containerDescriptor.current.deltaScroll[axis] +
        meta.deltaPosition[axis];

      const closestNode = sort.current.entries.reduce((prev, curr) =>
        Math.abs(curr.offsets[axis] - relatedListPosition) <
        Math.abs(prev.offsets[axis] - relatedListPosition)
          ? curr
          : prev
      );

      console.log(closestNode);

      // for (let i = 0; i < sort.current.entries.length; i++) {
      //   const element = array[i];

      // }

      console.table({
        relatedListPosition,
        deltaScroll: containerDescriptor.current.deltaScroll
      });
    }
  };

  const [onUpdateScroll, onClearAutoScrollInterval] = useAutoScroller(
    onStopInteraction,
    onScrollContainer,
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

    if (meta.activeNode) {
      meta.activeNode.setActiveState(true);
      const pos = getEventCoordinates(event);
      meta.deltaPosition = getDelta(pos, meta.initPosition);

      // based on position: fixed > top and left positions
      meta.currentPosition = {
        x: meta.deltaPosition.x + meta.activeNode.initPosition.x - meta.nodeMargin.x,
        y: meta.deltaPosition.y + meta.activeNode.initPosition.y - meta.nodeMargin.y
      };

      meta.activeNode.setHelperPosition(meta.currentPosition);

      if (containerDescriptor.current.hasScroll[axis]) {
        onUpdateScroll(
          meta.deltaPosition,
          meta.initRelatedContainerPosition,
          containerDescriptor.current.height,
          containerDescriptor.current.width
        );
      }
    }
  };

  const onDrop = (event: MouseEvent) => {
    onClearAutoScrollInterval();
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', onDrop);

    const meta = sort.current;

    if (meta.activeNode) {
      meta.activeNode.setActiveState(false);
      meta.activeNode = null;

      onDropChange(0, 0);
    }
  };

  // ====================================== LOG_INFO =====================================
  const LOG_INFO = (container: HTMLElement) => {
    const meta = sort.current;
    const result =
      meta.deltaPosition[axis] + meta.deltaRects[axis] - meta.initNodeNestedScroll[axis];
    // const result = meta.deltaPosition[axis] + meta.initNestedNodeOffsets[axis] - gap - meta.initNodeNestedScroll[axis];
    console.clear();
    console.table({
      initContainerNestedScroll: meta.initContainerNestedScroll,
      initNodeNestedScroll: meta.initNodeNestedScroll,
      initContainerScroll: meta.initContainerScroll,
      deltaPosition: meta.deltaPosition,
      initNestedNodeOffsets: meta.initNestedNodeOffsets,
      deltaRects: meta.deltaRects,
      containerRect: { x: meta.containerRect?.x, y: meta.containerRect?.y },
      activeNode: meta.activeNode?.initPosition,
      nodeMargin: meta.nodeMargin,
      result
    });
    console.log(meta.entries);
  };
  // ====================================== LOG_INFO =====================================

  const onStartDrag = useCallback(
    (
      event: MouseEvent | TouchEvent,
      node: DraggableSortableNode,
      originNode: React.MutableRefObject<HTMLElement | null>
    ) => {
      const meta = sort.current;
      const container = originNode.current?.parentElement;

      meta.activeNode = node;
      meta.initPosition = getEventCoordinates(event);

      meta.initNestedNodeOffsets = getNestedNodeOffset(originNode.current, container);

      const scrollableNodeAncestors = getScrollableAncestors(originNode.current);
      meta.initNodeNestedScroll = getNestedScrollOffsets(scrollableNodeAncestors);

      const scrollableContainerAncestors = getScrollableAncestors(container);
      meta.initContainerNestedScroll = getNestedScrollOffsets(scrollableContainerAncestors);

      if (container) {
        onSetScrollableContainer(container);
        meta.containerRect = container.getBoundingClientRect();
        meta.initRelatedContainerPosition = getDelta(meta.containerRect, meta.initPosition);
        meta.deltaRects = getDelta(meta.activeNode.initPosition, meta.containerRect);
        meta.nodeMargin = getElementMargin(originNode.current);

        document.addEventListener('mousemove', onDrag, { passive: false });
        document.addEventListener('mouseup', onDrop);

        LOG_INFO(container);
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
      {children}
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
