const { contextBridge, ipcRenderer } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('ql', {
  info: () => invoke('app:info'),
  win: {
    minimize: () => invoke('win:minimize'),
    toggleMaximize: () => invoke('win:toggle-maximize'),
    close: () => invoke('win:close'),
    state: () => invoke('win:state'),
    onState: (callback) => {
      const listener = (_event, state) => callback(state);
      ipcRenderer.on('win:state', listener);
      return () => ipcRenderer.removeListener('win:state', listener);
    },
  },
  config: {
    read: () => invoke('config:read'),
    save: (partial) => invoke('config:save', partial),
    setApiKey: (key) => invoke('config:set-api-key', key),
  },
  providers: {
    list: () => invoke('providers:list'),
    setKey: (id, key) => invoke('providers:set-key', id, key),
    setActive: (id) => invoke('providers:set-active', id),
    setModel: (id, model) => invoke('providers:set-model', id, model),
    setBaseUrl: (id, url) => invoke('providers:set-base-url', id, url),
    clear: (id) => invoke('providers:clear', id),
    models: (id) => invoke('providers:models', id),
  },
  state: () => invoke('state:read'),
  library: {
    list: () => invoke('library:list'),
    import: () => invoke('library:import'),
    remove: (name) => invoke('library:remove', name),
    dataUrl: (name) => invoke('library:data-url', name),
  },
  log: {
    tail: (limit) => invoke('log:tail', limit),
  },
  engine: {
    generate: (action) => invoke('engine:generate', action),
    setup: () => invoke('engine:setup'),
    setActivity: (enabled) => invoke('engine:set-activity', enabled),
    taskInfo: () => invoke('engine:task-info'),
    onStatus: (callback) => {
      const listener = (_event, status) => callback(status);
      ipcRenderer.on('engine:status', listener);
      return () => ipcRenderer.removeListener('engine:status', listener);
    },
  },
  card: {
    export: (payload) => invoke('card:export', payload),
    publish: (payload) => invoke('card:publish', payload),
  },
  pickSkillFile: () => invoke('dialog:pick-skill-file'),
  openFolder: (kind) => invoke('folder:open', kind),
});
