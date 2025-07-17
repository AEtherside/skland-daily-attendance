export interface SklandResponse<T> {
  code: number
  message: string
  data: T
}

export interface AuthResponse {
  status: number
  type: string
  msg: string
  data?: { code: string, uid: string }
}

export type CredResponse = SklandResponse<{ cred: string, userId: string, token: string }>

export interface BindingUserItem {
  uid: string
  isOfficial: boolean
  isDefault: boolean
  channelMasterId: string
  channelName: string
  nickName: string
  isDelete: boolean
}

export interface BindingUser {
  appCode: string
  appName: string
  bindingList: BindingUserItem[]
  defaultUid: string
}

export type BindingResponse = SklandResponse<{
  list: BindingUser[]
}>

export type GetAttendanceResponse = SklandResponse<{
  currentTs: string
  calendar: {
    resourceId: string
    type: string
    count: number
    available: boolean
    done: boolean
  }[]
  records: {
    resourceId: string
    type: string
    count: number
    ts: string
  }[]
  resourceInfoMap: {
    [key: string]: {
      id: string
      name: string
      type: string
    }
  }
}>

export type AttendanceResponse = SklandResponse<{
  ts: number
  awards: {
    resource: {
      id: string
      name: string
      type: string
    }
    count: number
  }[]
}>
