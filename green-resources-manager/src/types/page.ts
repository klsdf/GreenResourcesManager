// 资源类型常量数组（单一数据源）
export const RESOURCE_TYPES = ['Game', 'Software', 'Image', 'SingleImage', 'Video', 'Anime', 'Novel', 'Website', 'Audio', 'Other'] as const;

// 从常量数组生成类型
export type ResourceType = typeof RESOURCE_TYPES[number];

// 统一资源类型（小写，用于 UnifiedResource）
export const UNIFIED_RESOURCE_TYPES = ['game', 'image', 'singleimage', 'video', 'anime', 'novel', 'website', 'audio', 'software', 'other'] as const;

// 从常量数组生成统一资源类型
export type UnifiedResourceType = typeof UNIFIED_RESOURCE_TYPES[number];

export interface PageConfig {
  id: string;
  name: string;
  icon: string;
  type: ResourceType;  // 从 resourceTypes[0] 推导，只用于旧界面展示
  /** 旧的资源类名单。只用来读取已经保存的记录，页面设置里不再把它当成资源类型 */
  resourceTypes?: string[];
  /** 页面接受的基本资源类型。决定能放进什么文件，不决定有哪些字段 */
  acceptedKinds?: string[];
  /** 这个页面编辑时显示的字段。不改已经保存的资源内容 */
  pageFields?: string[];
  /** 这一页自己的字段定义。值仍写在资源记录上 */
  pageFieldDefs?: Array<{ key: string; label: string; editor: string }>;
  description?: string;
  isDefault?: boolean;
  isHidden?: boolean;
  filters?: {
    tags?: string[];
    excludeTags?: string[];
    [key: string]: any;
  };
  order: number;
  createdAt?: number;
  updatedAt?: number;
}
