import {connect} from 'react-redux';

import {GlobalState} from 'mattermost-redux/types/store';
import {getTheme} from 'mattermost-redux/selectors/entities/preferences';

import GpxPreviewOverride from './gpx_preview_override';

const mapStateToProps = (state: GlobalState) => ({
    theme: getTheme(state),
});

export default connect(mapStateToProps)(GpxPreviewOverride);