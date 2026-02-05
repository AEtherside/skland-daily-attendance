/**
 * 模板工具函数
 */

import type { NotificationData, TemplateDef } from '../types'

/**
 * 获取嵌套对象的值
 * @example getNestedValue({ a: { b: 1 } }, 'a.b') // 1
 */
export function getNestedValue(obj: unknown, path: string): unknown {
  return path.split('.').reduce((current: unknown, key) => {
    if (current && typeof current === 'object' && key in current) {
      return (current as Record<string, unknown>)[key]
    }
    return undefined
  }, obj)
}

/**
 * 渲染模板
 * 支持字符串模板（使用 {{path}} 语法）和函数模板
 */
export function renderTemplate<T = string>(
  template: TemplateDef<T>,
  data: NotificationData,
): T {
  if (typeof template === 'function') {
    return template(data)
  }

  // 字符串模板插值
  const rendered = template.replace(/\{\{(.+?)\}\}/g, (_, path: string) => {
    const value = getNestedValue(data, path.trim())
    return value !== undefined ? String(value) : ''
  })

  return rendered as T
}

/**
 * 定义模板的辅助函数（类型安全）
 */
export function defineTemplate<T = string>(template: TemplateDef<T>): TemplateDef<T> {
  return template
}
