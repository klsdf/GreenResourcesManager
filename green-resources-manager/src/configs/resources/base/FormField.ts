



// 文件选择过滤器类型
export interface FileSelectFilter {
	name: string // 过滤器名称（如 '图片文件'、'可执行文件'）
	extensions: string[] // 允许的文件扩展名数组（如 ['jpg', 'png']，支持 '*' 或 '其他' 作为通配符）
}

export abstract class FormField {
	fieldName: string
	required?: boolean


	constructor(fieldName: string, required?: boolean) {
		this.fieldName = fieldName
		this.required = required ?? true
	}
}


export class FormField_Text extends FormField {
	constructor(fieldName: string, required?: boolean) {
		super(fieldName, required)
	}
}

export class FormField_Textarea extends FormField {
	constructor(fieldName: string, required?: boolean) {
		super(fieldName, required)
	}
}

export class FormField_Number extends FormField {
	constructor(fieldName: string, required?: boolean) {
		super(fieldName, required)
	}
}

export class FormField_Date extends FormField {
	constructor(fieldName: string, required?: boolean) {
		super(fieldName, required)
	}
}

export class FormField_Select extends FormField {
	options: string[]
	constructor(fieldName: string, options: string[], required?: boolean) {
		super(fieldName, required)
		this.options = options
	}
}

export class FormField_SelectEngine extends FormField {

	options: object[] = [
		// 主流通用引擎
		{name: 'Unity', icon: 'unity.png'},
		{name: 'Unreal Engine', icon: 'unreal.png'},
		{name: 'Godot', icon: 'godot.png'},
		{name: 'CryEngine', icon: 'default.png'},
		{name: 'Source Engine', icon: 'default.png'},

		// Web / 桌面壳 / 跨平台（独立游戏常用）
		{name: 'Electron', icon: 'default.png'},
		{name: 'NW.js', icon: 'rmmz.png'},
		{name: 'Tauri', icon: 'default.png'},

		// 独立 / 轻量游戏引擎
		{name: 'GameMaker Studio', icon: 'default.png'},
		{name: 'Defold', icon: 'default.png'},
		{name: 'Cocos2d', icon: 'default.png'},
		{name: 'Cocos Creator', icon: 'default.png'},
		{name: 'Phaser', icon: 'default.png'},
		{name: 'Love2D', icon: 'default.png'},
		{name: 'MonoGame', icon: 'default.png'},
		{name: 'XNA', icon: 'default.png'},
		{name: 'libGDX', icon: 'default.png'},
		{name: 'Bevy', icon: 'default.png'},
		{name: 'HaxeFlixel', icon: 'default.png'},
		{name: 'GDevelop', icon: 'default.png'},

		// Galgame / 视觉小说引擎
		{name: "Ren'Py", icon: 'renpy.png'},
		{name: 'TyranoBuilder', icon: 'tybuilder.png'},
		{name: 'TyranoScript', icon: 'tyscript.png'},
		{name: 'Kirikiri / 吉里吉里', icon: 'krkr.png'},
		{name: 'Kirikiri Z', icon: 'krkr.png'},
		{name: 'CatSystem2', icon: 'default.png'},
		{name: 'Ethornell (BGI)', icon: 'default.png'},
		{name: 'Entis', icon: 'default.png'},
		{name: 'NScripter', icon: 'default.png'},
		{name: 'ONScripter', icon: 'default.png'},
		{name: 'Artemis Engine', icon: 'default.png'},
		{name: 'Visual Novel Maker', icon: 'default.png'},
		{name: 'MondayOFF VN Engine', icon: 'default.png'},
		{name: 'Unity + VN Framework', icon: 'default.png'},
		{name: 'Godot + VN Plugin', icon: 'default.png'},

		// RPG 系
		{name: 'RPG Maker 2000/2003', icon: 'rm2k.png'},
		{name: 'RPG Maker XP', icon: 'rmxp.png'},
		{name: 'Rpg Maker VX', icon: 'rmvx.png'},
		{name: 'RPG Maker VX Ace', icon: 'rmva.png'},
		{name: 'RPG Maker MV', icon: 'rmmv.png'},
		{name: 'RPG Maker MZ', icon: 'rmmz.png'},
		{name: 'Wolf RPG', icon: 'wolf.png'},
		{name: 'SRPG Studio', icon: 'srpg.png'},
		{name: 'Pixel Game Maker MV', icon: 'pixel.png'},
		{name: 'RPG Developer Bakin', icon: 'bakin.png'},

		// 交互叙事 / 非传统游戏
		{name: 'Twine', icon: 'default.png'},
		{name: 'Ink', icon: 'default.png'},
		{name: 'Yarn Spinner', icon: 'default.png'},

		// 可视化 / 教育
		{name: 'Scratch', icon: 'default.png'},
		{name: 'Construct', icon: 'default.png'},
		{name: 'Clickteam Fusion', icon: 'default.png'},

		// 底层 / 语言级
		{name: 'Flash / ActionScript', icon: 'flash.png'},
		{name: 'Java', icon: 'java.png'},
		{name: 'Python / Pygame', icon: 'python.png'},
		{name: 'C++ 自研引擎', icon: 'default.png'},

		// 兜底
		{name: '其他', icon: 'default.png'}
	]

	constructor(fieldName: string, required?: boolean) {
		super(fieldName, required)
	}
}


/**
 * 封面选择字段
 */
abstract class FormField_SelectCover extends FormField {
	filters: FileSelectFilter[] = [
		{ name: '图片文件', extensions: ['jpg', 'jpeg', 'jpe', 'jfif', 'png', 'gif', 'webp', 'avif', 'bmp', 'svg'] }
	]
	constructor(fieldName: string, required?: boolean) {
		super(fieldName, required)
	}
}


/**
 * 游戏封面选择字段
 */
export class FormField_SelectGameCover extends FormField_SelectCover {

	constructor(fieldName: string, required?: boolean) {
		super(fieldName, required)
	}
}

/**
 * 漫画封面选择字段
 */
export class FormField_SelectMangaCover extends FormField_SelectCover {

	constructor(fieldName: string, required?: boolean) {
		super(fieldName, required)
	}
}

/**
 * 视频缩略图选择字段
 */
export class FormField_SelectVideoThumbnail extends FormField_SelectCover {

	constructor(fieldName: string, required?: boolean) {
		super(fieldName, required)
	}
}

/**
 * 单选按钮字段
 */
export class FormField_Radio extends FormField {
	options: string[]
	constructor(fieldName: string, options: string[], required?: boolean) {
		super(fieldName, required)
		this.options = options
	}
}

/**
 * 文件选择字段
 */
export class FormField_SelectFile extends FormField {
	filters: FileSelectFilter[]
	constructor(fieldName: string, filters: FileSelectFilter[], required?: boolean) {
		super(fieldName, required)
		this.filters = filters
	}
}

/**
 * 单图片文件选择字段（编辑时仅展示预览 +「选择图片」按钮，无清除按钮）
 */
export class FormField_SelectSingleImageFile extends FormField {
	filters: FileSelectFilter[]
	constructor(fieldName: string, filters: FileSelectFilter[], required?: boolean) {
		super(fieldName, required)
		this.filters = filters
	}
}

/**
 * 文件夹选择字段
 */
export class FormField_SelectFolder extends FormField {
	constructor(fieldName: string, required?: boolean) {
		super(fieldName, required)
	}
}

/**
 * 标签字段
 */
export class FormField_Tags extends FormField {
	constructor(fieldName: string, required?: boolean) {
		super(fieldName, required)
	}
}

/**
 * 复选框字段
 */
export class FormField_Checkbox extends FormField {
	constructor(fieldName: string, required?: boolean) {
		super(fieldName, required)
	}
}
