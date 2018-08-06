import React from "react";
import { withRouter } from "react-router-dom";
import autoBind from "react-autobind";
import isEmpty from "lodash/isEmpty";
import find from "lodash/find";
import indexOf from "lodash/indexOf";

import Loader from "./Loader";
import StepMessage from "./StepMessage";
import StepDone from "./StepDone";
import StepBuildingAssets from "./StepBuildingAssets";
import StepHelmIntro from "../../containers/HelmChartInfo";
import StepHelmValues from "../kustomize/HelmValuesEditor";

import "../../scss/components/shared/DetermineStep.scss";

class DetermineStep extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      maxPollReached: false
    };
    autoBind(this);
  }

  async handleAction(action) {
    const currRoute = find(this.props.routes, ["id", this.props.routeId]);
    const currIndex = indexOf(this.props.routes, currRoute);
    const nextRoute = this.props.routes[currIndex + 1];
    await this.props.submitAction({action}).then(() => {
      this.props.history.push(`/${nextRoute.id}`);
    });
  }

  renderStep(phase) {
    const { currentStep, progress, actions } = this.props;
    if (!phase.length || !phase) return null;
    switch (phase) {
    case "message":
      return (
        <StepMessage 
          actions={actions} 
          message={currentStep.message} 
          level={currentStep.level} 
          handleAction={this.handleAction} 
          isLoading={this.props.dataLoading.submitActionLoading} 
        />
      );
    case "stream":
      return (
        <StepMessage 
          actions={actions} 
          message={currentStep.message} 
          level={currentStep.level} 
          handleAction={this.handleAction} 
          isLoading={this.props.dataLoading.submitActionLoading || !currentStep.message.contents} 
        />
      );
    case "render.confirm":
      return (
        <StepBuildingAssets 
          getStep={this.props.getCurrentStep}
          stepId={this.props.routeId} 
          status={progress} 
        />
      );
    case "terraform.prepare":
      return (
        <StepBuildingAssets 
          getStep={this.props.getCurrentStep}
          stepId={this.props.routeId} 
          status={progress} 
        />
      );
    case "helm-intro":
      return (
        <StepHelmIntro
          actions={actions}
          helmChartMetadata={this.props.helmChartMetadata} 
          handleAction={this.handleAction} 
          isLoading={this.props.dataLoading.submitActionLoading} 
        />
      );
    case "helm-values":
      return (
        <StepHelmValues
          saveValues={this.props.saveHelmChartValues}
          getStep={currentStep.helmValues}
          helmChartMetadata={this.props.helmChartMetadata} 
          actions={actions} 
          handleAction={this.handleAction} 
          isLoading={this.props.dataLoading.submitActionLoading}
        />
      );
    case "done":
      return (
        <StepDone />
      );
    default:
      return (
        <div className="flex1 flex-column justifyContent--center alignItems--center">
          <Loader size="60" />
        </div>
      );
    }
  }

  startMaxTimeout() {
    this.maxTimout = setTimeout(() => this.setState({ maxPollReached: true }), 60000);
  }

  componentDidMount() {
    this.props.getHelmChartMetadata();
    this.startPoll();
    this.startMaxTimeout();
    this.pollIfStream();
  }

  componentWillUnmount() {
    clearTimeout(this.timeout);
    clearTimeout(this.maxTimout);
    clearInterval(this.streamer);
  }

  componentDidUpdate(lastProps) {
    if (this.props.currentStep !== lastProps.currentStep && !isEmpty(this.props.currentStep)) {
      clearTimeout(this.timeout);
      clearTimeout(this.maxTimout);
    }
    if (this.props.currentStep !== lastProps.currentStep && isEmpty(this.props.currentStep)) {
      clearTimeout(this.timeout);
      if (!this.props.dataLoading.getCurrentStepLoading && !this.state.maxPollReached) {
        this.startPoll();
      }
    }

    if (this.props.phase !== lastProps.phase) {
      if (this.props.phase === "render.config") {
        this.props.history.push("/application-settings");
      }
      if (this.props.phase === "kustomize") {
        this.props.history.push("/kustomize");
      }
    }
    this.pollIfStream();
  }

  startPoll() {
    this.timeout = setTimeout(() => this.props.getCurrentStep("getCurrentStep" , this.props.routeId), 1000);
  }

  pollIfStream() {
    if (this.props.phase !== "stream") {
      clearInterval(this.streamer);
      delete this.streamer;
      return;
    }
    if (!this.streamer) {
      this.streamer = setInterval(() => this.props.getCurrentStep("getCurrentStep" , this.props.routeId), 1000);
    }
  }

  render() {
    const { phase, currentStep, dataLoading } = this.props;
    const isLoadingStep = phase === "loading" || isEmpty(currentStep);
    return (
      <div className="flex-column flex1">
        <div className="flex-column flex1 u-overflow--hidden u-position--relative">
          <div className="flex-1-auto flex-column u-overflow--auto container u-paddingTop--30">
            {(isLoadingStep || dataLoading.getCurrentStepLoading || dataLoading.getHelmChartMetadataLoading) && !this.state.maxPollReached ?
              <div className="flex1 flex-column justifyContent--center alignItems--center">
                <Loader size="60" />
              </div>
              : this.state.maxPollReached ?
                <div className="flex1 flex-column justifyContent--center alignItems--center">
                  <p className="u-fontSize--large u-fontWeight--medium u-color--tundora">Oops, something isn't quite right. If you continue to experience this problem contact <a href="mailto:support@replicated.com">support@replicated.com</a></p>
                </div>
                :
                this.renderStep(phase)
            }
          </div>
        </div>
      </div>
    );
  }
}

export default withRouter(DetermineStep)