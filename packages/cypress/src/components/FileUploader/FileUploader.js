/*
 * Copyright contributors to the Hyperledger Fabric Operations Console project
 *
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
import PropTypes from 'prop-types';
import React, { Component } from 'react';

class FileUploader extends Component {
	render() {
		return (
			<div className="ibp-file-uploader">
				<strong className="bx--label">{this.props.labelTitle}</strong>
				<p className="bx--label-description">{this.props.labelDescription}</p>
				<label
					id={this.props.id + '-label'}
					tabIndex={this.props.tabIndex || 0}
					className={'bx--btn bx--btn--primary' + (this.props.disabled ? ' ibp-btn-disabled' : '')}
					onKeyDown={evt => {
						if (evt.which === 13 || evt.which === 32) {
							this.input.click();
						}
					}}
					htmlFor={this.props.id}
				>
					{this.props.buttonLabel}
				</label>
				<input
					className="bx--visually-hidden"
					ref={input => (this.input = input)}
					id={this.props.id}
					disabled={this.props.disabled}
					type="file"
					tabIndex="-1"
					multiple={this.props.multiple}
					accept={this.props.accept}
					name={this.props.name}
					onChange={this.props.onChange}
					onClick={evt => {
						evt.target.value = null;
					}}
				/>
			</div>
		);
	}
}

FileUploader.propTypes = {
	labelTitle: PropTypes.string,
	labelDescription: PropTypes.string,
	id: PropTypes.string,
	buttonLabel: PropTypes.string,
	disabled: PropTypes.bool,
	multiple: PropTypes.bool,
	accept: PropTypes.array,
	name: PropTypes.string,
	onChange: PropTypes.func,
	tabIndex: PropTypes.string,
};

export default FileUploader;
