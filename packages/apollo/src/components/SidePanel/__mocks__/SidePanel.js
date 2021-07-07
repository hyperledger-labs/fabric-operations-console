/* eslint-disable react/prop-types */

/**
 * this file is used to return a mock implementation of the SidePanel component
 * elsewhere we use inline jest mocks to mock unwanted child components, but this wasn't possible with SidePanel due to its use of refs
 * it's not possible to pass refs to functional componenets without using React.forwardRef, but jest doesn't allow inline references to external modules
 * instead we create an actual React component in a separate mock file and replace SidePanel in the test files
 */

import React from 'react';

export default class SidePanel extends React.Component {
	render() {
		return <>{this.props.children}</>;
	}
}
