import type {Store} from 'redux';

import type {FileInfo} from '@mattermost/types/files';
import type {GlobalState} from '@mattermost/types/store';

import GpxPreviewOverride from './components/gpx_preview_override';
import manifest from './manifest';
// eslint-disable-next-line import/no-unresolved
import type {PluginRegistry} from './types/mattermost-webapp';

export default class Plugin {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    public async initialize(registry: PluginRegistry, store: Store<GlobalState>) {
        // @see https://developers.mattermost.com/extend/plugins/webapp/reference/
        registry.registerFilePreviewComponent(
            (fileInfos: FileInfo[]) => fileInfos.every((fileInfo) => fileInfo.extension === 'gpx'),
            GpxPreviewOverride,
        );
    }
}

declare global {
    interface Window {
        registerPlugin(id: string, plugin: Plugin): void;
    }
}

window.registerPlugin(manifest.id, new Plugin());
