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
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import ChipInput from 'material-ui-chip-input';
import Avatar from '@material-ui/core/Avatar';
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
		background: '#242a2e',
		color: '#BEBEBE',
		fontSize: '0.75rem',
		lineHeight: '1rem',
		marginTop: '0.5rem',
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

class EmailChips extends Component {
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
							const emails = clipboardText.split(new RegExp(separators.join('|'), 'g'));
							const chips = emails.filter(t => t.length > 0).map(t => t.trim());
							let isAnyChipInvalid = false;
							for (let index = 0; index < chips.length; index++) {
								if (!this.props.handleBeforeAddChip(chips[index])) {
									isAnyChipInvalid = true;
									break;
								}
							}
							if (!isAnyChipInvalid) {
								this.props.handleAddChip(...chips);
							}
						}}
						onBeforeAdd={chip => {
							return this.props.handleBeforeAddChip(chip);
						}}
						onAdd={chip => {
							const separators = [' ', ','];
							const emails = chip.split(new RegExp(separators.join('|'), 'g'));
							const chips = emails.filter(t => t.length > 0).map(t => t.trim());
							this.props.handleAddChip(...chips);
						}}
						onDelete={deletedChip => {
							this.props.handleDeleteChip(deletedChip);
						}}
						chipRenderer={({ value, handleClick, handleDelete }, key) => (
							<Chip
								key={key}
								style={{ margin: '8px 8px 0 0', float: 'left' }}
								avatar={<Avatar size={32}>{value[0].toUpperCase()}</Avatar>}
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

EmailChips.propTypes = {
	id: PropTypes.string,
	classes: PropTypes.object,
	placeholder: PropTypes.string,
	value: PropTypes.array,
	isAdmin: PropTypes.bool,
	handleBeforeAddChip: PropTypes.func,
	handleAddChip: PropTypes.func,
	handleDeleteChip: PropTypes.func,
	rootClasses: PropTypes.object,
};

export default withStyles(styles)(EmailChips);
