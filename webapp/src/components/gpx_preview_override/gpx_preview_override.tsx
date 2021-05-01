import React from 'react';

import {FileInfo} from 'mattermost-redux/types/files';
import {Theme} from 'mattermost-redux/types/preferences';

import Iframe from 'react-iframe';

type Props = {
    fileInfo: FileInfo;
    onModalDismissed: () => void;
    theme: Theme;
};

type State = {
    mapUrl: string;
};

export default class FilePreviewOverride extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {mapUrl: ''};
        const url = '/api/v4/files/' + this.props.fileInfo.id;
        fetch(url).
            then((r) => r.text()).
            then((gpx) => {
                const formData = new FormData();
                var gpxBlob = new Blob([gpx], { type: "text/xml"});
                formData.append('form-map-gpx', gpxBlob);
                return fetch('https://gpx.tomacla.info/', {
                    method: 'post',
                    body: formData,
                }).then((response) => {
                    this.setState({mapUrl: response.url});
                });
            },
            );
    }

    render() {
        const theme = this.props.theme;

        const style = {
            backgroundColor: theme.centerChannelBg,
            color: theme.centerChannelColor,
            paddingTop: '10px',
            paddingBottom: '10px',
        };

        const buttonStyle = {
            backgroundColor: theme.buttonBg,
            color: theme.buttonColor,
        };

        const content = JSON.stringify(this.props.fileInfo);

        return (
            <div style={style}>
                <Iframe
                    url={this.state.mapUrl}
                    width='1024px'
                    height='768px'
                    position='relative'
                />
                <button
                    className={'save-button btn'}
                    style={buttonStyle}
                    onClick={this.props.onModalDismissed}
                >
                    {'Close'}
                </button>
            </div>
        );
    }
}
