import {Store, Action} from 'redux';

import {GlobalState} from 'mattermost-redux/types/store';

import {FileInfo} from 'mattermost-redux/types/files';

import manifest from './manifest';

import GpxPreviewOverride from './components/gpx_preview_override';

// eslint-disable-next-line import/no-unresolved
import {PluginRegistry} from './types/mattermost-webapp';

export default class Plugin {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    public async initialize(registry: PluginRegistry, store: Store<GlobalState, Action<Record<string, unknown>>>) {
        // @see https://developers.mattermost.com/extend/plugins/webapp/reference/
        registry.registerFilePreviewComponent((fileInfo: FileInfo) => fileInfo.extension === 'gpx', GpxPreviewOverride);
    }
}

declare global {
    interface Window {
        registerPlugin(id: string, plugin: Plugin): void
    }
}

window.registerPlugin(manifest.id, new Plugin());
