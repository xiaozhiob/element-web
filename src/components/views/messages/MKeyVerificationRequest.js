/*
Copyright 2019 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React from 'react';
import PropTypes from 'prop-types';
import MatrixClientPeg from '../../../MatrixClientPeg';
import sdk from '../../../index';
import { _t } from '../../../languageHandler';
import {getNameForEventRoom, userLabelForEventRoom}
    from '../../../utils/KeyVerificationStateObserver';
import dis from "../../../dispatcher";
import {RIGHT_PANEL_PHASES} from "../../../stores/RightPanelStorePhases";

export default class MKeyVerificationRequest extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        const request = this.props.mxEvent.verificationRequest;
        if (request) {
            request.on("change", this._onRequestChanged);
        }
    }

    componentWillUnmount() {
        const request = this.props.mxEvent.verificationRequest;
        if (request) {
            request.off("change", this._onRequestChanged);
        }
    }

    _onRequestChanged = () => {
        this.forceUpdate();
    };

    _onAcceptClicked = async () => {
        const request = this.props.mxEvent.verificationRequest;
        if (request) {
            try {
                await request.accept();
                dis.dispatch({action: "show_right_panel"});
                dis.dispatch({
                    action: "set_right_panel_phase",
                    phase: RIGHT_PANEL_PHASES.EncryptionPanel,
                    verificationRequest: request,
                });
            } catch (err) {
                console.error(err.message);
            }
        }
    };

    _onRejectClicked = async () => {
        const request = this.props.mxEvent.verificationRequest;
        if (request) {
            try {
                await request.cancel();
            } catch (err) {
                console.error(err.message);
            }
        }
    };

    _acceptedLabel(userId) {
        const client = MatrixClientPeg.get();
        const myUserId = client.getUserId();
        if (userId === myUserId) {
            return _t("You accepted");
        } else {
            return _t("%(name)s accepted", {name: getNameForEventRoom(userId, this.props.mxEvent)});
        }
    }

    _cancelledLabel(userId) {
        const client = MatrixClientPeg.get();
        const myUserId = client.getUserId();
        if (userId === myUserId) {
            return _t("You cancelled");
        } else {
            return _t("%(name)s cancelled", {name: getNameForEventRoom(userId, this.props.mxEvent)});
        }
    }

    render() {
        const {mxEvent} = this.props;
        const request = mxEvent.verificationRequest;

        let title;
        let subtitle;
        let stateNode;

        if (!request) {
            return <p>This is an invalid request, ho ho ho!</p>;
        }

        if (request.ready || request.started || request.cancelled) {
            let stateLabel;
            if (request.ready || request.started) {
                stateLabel = this._acceptedLabel(request.receivingUserId);
            } else if (request.cancelled) {
                stateLabel = this._cancelledLabel(request.cancellingUserId);
            }
            stateNode = (<div className="mx_KeyVerification_state">{stateLabel}</div>);
        }

        if (!request.initiatedByMe) {
            title = (<div className="mx_KeyVerification_title">{
                _t("%(name)s wants to verify", {name: getNameForEventRoom(request.requestingUserId, mxEvent)})}</div>);
            subtitle = (<div className="mx_KeyVerification_subtitle">{
                userLabelForEventRoom(request.requestingUserId, mxEvent)}</div>);
            if (request.requested) {
                const FormButton = sdk.getComponent("elements.FormButton");
                stateNode = (<div className="mx_KeyVerification_buttons">
                    <FormButton kind="danger" onClick={this._onRejectClicked} label={_t("Decline")} />
                    <FormButton onClick={this._onAcceptClicked} label={_t("Accept")} />
                </div>);
            }
        } else { // request sent by us
            title = (<div className="mx_KeyVerification_title">{
                _t("You sent a verification request")}</div>);
            subtitle = (<div className="mx_KeyVerification_subtitle">{
                userLabelForEventRoom(request.receivingUserId, mxEvent)}</div>);
        }

        if (title) {
            return (<div className="mx_EventTile_bubble mx_KeyVerification mx_KeyVerification_icon">
                {title}
                {subtitle}
                {stateNode}
            </div>);
        }
        return null;
    }
}

MKeyVerificationRequest.propTypes = {
    /* the MatrixEvent to show */
    mxEvent: PropTypes.object.isRequired,
};
