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
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ChipInput from 'material-ui-chip-input';
import Chip from '@material-ui/core/Chip';
import withStyles from '@material-ui/core/styles/withStyles';
import { createMuiTheme, MuiThemeProvider } from '@material-ui/core/styles';

const styles = {
	chipInputText: {
		color: '#8C8C8C',
		fontSize: '0.875rem',
		lineHeight: '1.125rem',
		marginTop: '0.5rem',
		marginBottom: '0.5rem',
		maxWidth: '100%',
		overflow: 'hidden',
		whiteSpace: 'nowrap',
	},
	chipInputRoot: {
		border: '1px solid #8C8C8C',
		background: '#373D42',
		color: '#BEBEBE',
		fontSize: '0.75rem',
		lineHeight: '1rem',
		marginTop: '1.5rem',
		minHeight: '9.25rem',
		padding: '0 1rem',
		resize: 'none',
		width: '30rem',
	},
};

const theme = createMuiTheme({
	typography: {
		useNextVariants: true,
	},
});

class GenericChips extends Component {
	render = () => {
		const { classes } = this.props;
		return (
			<MuiThemeProvider theme={theme}>
				<div>
					<ChipInput
						id={this.props.id}
						classes={{
							input: classes.chipInputText,
							root: classes.chipInputRoot,
						}}
						placeholder={this.props.placeholder}
						allowDuplicates={false}
						fullWidthInput={true}
						value={this.props.value}
						blurBehavior="add"
						onPaste={event => {
							const clipboardText = event.clipboardData.getData('Text');
							event.preventDefault();
							const separators = [' ', ','];
							const list = clipboardText.split(new RegExp(separators.join('|'), 'g'));
							const chips = list.filter(t => t.length > 0).map(t => t.trim());
							this.props.handleAddChip(...chips);
						}}
						onBeforeAdd={chip => {
							return this.props.handleBeforeAddChip(chip);
						}}
						onAdd={chip => {
							const separators = [' ', ','];
							const list = chip.split(new RegExp(separators.join('|'), 'g'));
							const chips = list.filter(t => t.length > 0).map(t => t.trim());
							this.props.handleAddChip(...chips);
						}}
						onDelete={deletedChip => this.props.handleDeleteChip(deletedChip)}
						chipRenderer={({ value, handleClick, handleDelete }, key) => (
							<Chip key={key}
								style={{ margin: '8px 8px 0 0', float: 'left' }}
								onClick={handleClick}
								onDelete={handleDelete}
								label={value}
							/>
						)}
					/>
				</div>
			</MuiThemeProvider>
		);
	};
}

GenericChips.propTypes = {
	id: PropTypes.string,
	classes: PropTypes.object,
	placeholder: PropTypes.string,
	value: PropTypes.array,
	handleBeforeAddChip: PropTypes.func,
	handleAddChip: PropTypes.func,
	handleDeleteChip: PropTypes.func,
	rootClasses: PropTypes.object,
};

export default withStyles(styles)(GenericChips);
