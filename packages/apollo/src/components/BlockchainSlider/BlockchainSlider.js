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

import React from 'react';
import PropTypes from 'prop-types';
import { Slider } from 'carbon-components-react';

const BlockchainSlider = ({ id, value, min, max, step, minLabel, maxLabel, ariaLabelInput, labelText, onChange, formatLabel }) => {
	let sliderRef = null;
	return (
		<Slider
			id={id}
			value={value}
			min={min}
			max={max}
			step={step}
			minLabel={minLabel}
			maxLabel={maxLabel}
			ariaLabelInput={ariaLabelInput}
			labelText={labelText}
			onChange={evt => {
				let value = evt.value;
				if (sliderRef && sliderRef.state) {
					value = sliderRef.state.value;
				}
				onChange({ value });
			}}
			formatLabel={formatLabel}
			ref={ref => {
				sliderRef = ref;
				if (sliderRef) {
					if (sliderRef.element.previousSibling) {
						sliderRef.element.previousSibling.setAttribute('role', 'presentation');
					}
					if (sliderRef.element.nextSibling) {
						sliderRef.element.nextSibling.setAttribute('role', 'presentation');
					}
					let child = sliderRef.element.firstChild;
					while (child) {
						if (child.className && child.className.indexOf('track') > -1) {
							child.setAttribute('role', 'presentation');
						}
						if (child.className && child.className.indexOf('thumb') > -1) {
							child.setAttribute('aria-label', labelText);
						}
						child = child.nextSibling;
					}
					let sliderCalcValue = sliderRef.calcValue;
					sliderRef.calcValue = data => {
						let result = null;
						if (data.clientX) {
							result = sliderCalcValue(data);
						} else {
							let value = data.value;
							if (data.value < min) value = min;
							if (data.value > max) value = max;
							let left = Math.round(((value - min) / (max - min)) * 100);
							if (left < 0) left = 0;
							if (left > 100) left = 100;
							result = {
								value,
								left,
							};
						}
						return result;
					};
				}
			}}
		/>
	);
};

BlockchainSlider.propTypes = {
	id: PropTypes.string,
	value: PropTypes.number,
	min: PropTypes.number,
	max: PropTypes.number,
	step: PropTypes.number,
	minLabel: PropTypes.string,
	maxLabel: PropTypes.string,
	ariaLabelInput: PropTypes.string,
	labelText: PropTypes.string,
	onChange: PropTypes.func,
	formatLabel: PropTypes.func,
};

export default BlockchainSlider;
