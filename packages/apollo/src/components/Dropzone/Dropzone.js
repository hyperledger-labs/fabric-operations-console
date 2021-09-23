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
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import Logger from '../Log/Logger';

const SCOPE = 'Dropzone';
const Log = new Logger(SCOPE);

class Dropzone extends Component {
	constructor(props) {
		super(props);
		this.state = { highlight: false };
		this.fileInputRef = React.createRef();

		this.openFileDialog = this.openFileDialog.bind(this);
		this.onFilesAdded = this.onFilesAdded.bind(this);
		this.onDragOver = this.onDragOver.bind(this);
		this.onDragLeave = this.onDragLeave.bind(this);
		this.onDrop = this.onDrop.bind(this);
	}

	openFileDialog() {
		if (this.props.disabled) return;
		this.fileInputRef.current.click();
	}

	onFilesAdded(event) {
		if (this.props.disabled) return;
		const files = event.target.files;
		Log.info('added file');
		if (this.props.onFilesAdded) {
			const array = this.fileListToArray(files);
			this.props.onFilesAdded(array);
		}
	}

	onDragOver(evt) {
		evt.preventDefault();
		if (this.props.disabled) return;
		this.setState({ highlight: true });
	}

	onDragLeave() {
		this.setState({ highlight: false });
	}

	onDrop(event) {
		event.preventDefault();

		if (this.props.disabled) return;

		const files = event.dataTransfer.files;
		if (this.props.onFilesAdded) {
			const array = this.fileListToArray(files);
			this.props.onFilesAdded(array);
		}
		this.setState({ highlight: false });
	}

	fileListToArray(list) {
		const array = [];
		for (let i = 0; i < list.length; i++) {
			array.push(list.item(i));
		}
		return array;
	}

	render() {
		return (
			<div
				className={`ibp--dropzone-container ${this.state.highlight ? 'ibp--dropzone--highlight' : ''} ${this.props.className ? this.props.className : ''}`}
				onDragOver={this.onDragOver}
				onDragLeave={this.onDragLeave}
				onDrop={this.onDrop}
				onClick={this.openFileDialog}
				style={{ cursor: this.props.disabled ? 'default' : 'pointer' }}
				tabIndex="1"
			>
				<input
					ref={this.fileInputRef}
					className="FileInput"
					type="file"
					multiple={this.props.multiple}
					onChange={this.onFilesAdded}
					accept={this.props.acceptedFileTypes}
				/>
				{this.props.children}
			</div>
		);
	}
}

Dropzone.propTypes = {
	children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]),
	className: PropTypes.string,
	disabled: PropTypes.bool,
	multiple: PropTypes.bool,
	onFilesAdded: PropTypes.func,
	acceptedFileTypes: PropTypes.arrayOf(PropTypes.string),
};

export default Dropzone;
