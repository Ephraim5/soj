type Handler = (...args:any[])=>void;

class EventBus {
  private listeners: Record<string, Set<Handler>> = {};
  on(event: string, handler: Handler){
    if(!this.listeners[event]) this.listeners[event] = new Set();
    this.listeners[event].add(handler);
    return () => this.off(event, handler);
  }
  off(event: string, handler: Handler){
    this.listeners[event]?.delete(handler);
  }
  emit(event: string, ...args:any[]){
    this.listeners[event]?.forEach(h=>{ try{ h(...args); }catch{} });
  }
}

export const eventBus = new EventBus();
