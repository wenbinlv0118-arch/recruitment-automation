import React, { memo, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import styled from 'styled-components';

const VirtualizedContainer = styled.div`
  height: 100%;
  width: 100%;
`;

/**
 * 虚拟化列表项组件
 */
const VirtualizedListItem = memo(({ index, style, data }) => {
  const item = data[index];
  
  return (
    <div style={style}>
      <div style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0' }}>
        {item.content || `Item ${index}`}
      </div>
    </div>
  );
});

VirtualizedListItem.displayName = 'VirtualizedListItem';

/**
 * 虚拟化列表组件
 * 用于优化大量数据的渲染性能
 */
const VirtualizedList = memo(({ 
  items = [], 
  height = 400, 
  itemHeight = 50,
  className 
}) => {
  // 渲染项目的回调
  const renderItem = useCallback((props) => (
    <VirtualizedListItem {...props} data={items} />
  ), [items]);
  
  return (
    <VirtualizedContainer className={className}>
      <List
        height={height}
        itemCount={items.length}
        itemSize={itemHeight}
        itemData={items}
      >
        {renderItem}
      </List>
    </VirtualizedContainer>
  );
});

VirtualizedList.displayName = 'VirtualizedList';

export default VirtualizedList;
