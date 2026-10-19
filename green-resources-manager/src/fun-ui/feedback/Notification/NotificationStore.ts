export interface NotificationMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  content: string
  timestamp: string
  read: boolean
}

class NotificationStore {
  private messages: NotificationMessage[] = []
  private listeners: Set<() => void> = new Set()

  constructor() {
    this.loadFromLocalStorage()
  }

  private loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem('notificationMessages')
      if (saved) {
        this.messages = JSON.parse(saved)
      }
    } catch (error) {
      console.error('加载本地存储消息失败:', error)
      this.messages = []
    }
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('notificationMessages', JSON.stringify(this.messages))
    } catch (error) {
      console.error('保存消息到本地存储失败:', error)
    }
  }

  private notify(): void {
    this.listeners.forEach(listener => listener())
  }

  addMessage(message: Omit<NotificationMessage, 'id' | 'timestamp' | 'read'>): NotificationMessage {
    const newMessage: NotificationMessage = {
      ...message,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      read: false
    }

    this.messages.unshift(newMessage)
    this.saveToLocalStorage()
    this.notify()

    return newMessage
  }

  removeMessage(id: string): void {
    const index = this.messages.findIndex(msg => msg.id === id)
    if (index !== -1) {
      this.messages.splice(index, 1)
      this.saveToLocalStorage()
      this.notify()
    }
  }

  clearAllMessages(): void {
    this.messages = []
    this.saveToLocalStorage()
    this.notify()
  }

  markAsRead(id: string): void {
    const message = this.messages.find(msg => msg.id === id)
    if (message) {
      message.read = true
      this.saveToLocalStorage()
      this.notify()
    }
  }

  markAllAsRead(): void {
    this.messages.forEach(msg => {
      msg.read = true
    })
    this.saveToLocalStorage()
    this.notify()
  }

  getMessages(): NotificationMessage[] {
    return [...this.messages]
  }

  getUnreadCount(): number {
    return this.messages.filter(msg => !msg.read).length
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }
}

export default new NotificationStore()
