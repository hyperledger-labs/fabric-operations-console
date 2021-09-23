/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/
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
