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
import React from 'react';
import { withLocalize } from 'react-localize-redux';
import { connect } from 'react-redux';

const TranslateLink = props => {
	const translate = props.translate;
	let params = {
		...props.params,
	};
	if (!params['DOC_PREFIX']) {
		params['DOC_PREFIX'] = props.docPrefix;
	}
	let text = translate(props.text, params);
	let res = [];
	let s_idx = text.indexOf('[[');
	let e_idx = text.indexOf(']]');
	let key = 0;
	while (s_idx >= 0 && e_idx >= 0) {
		key++;
		let a_body = text.substring(s_idx + 2, e_idx);
		let s_p_idx = text.indexOf('(', e_idx);
		let e_p_idx = text.indexOf(')', s_p_idx);
		let link_name = text.substring(s_p_idx + 1, e_p_idx);
		let url = translate(link_name, params);
		let part1 = text.slice(0, s_idx);
		res.push(part1);
		text = text.slice(e_p_idx + 1);
		let a = (
			<a key={key}
				href={url}
				target="_blank"
				title={part1 + a_body + text}
				rel="noopener noreferrer"
				className="tl-link"
			>
				{a_body}
			</a>
		);
		res.push(a);
		s_idx = text.indexOf('[[');
		e_idx = text.indexOf(']]');
	}
	res.push(text);
	return <p className={props.className}>{res}</p>;
};

TranslateLink.propTypes = {
	text: PropTypes.string,
	params: PropTypes.object,
	className: PropTypes.string,
	docPrefix: PropTypes.string,
	translate: PropTypes.func, // Provided by withLocalize
};

export default connect(state => {
	return {
		docPrefix: state['settings'] ? state['settings']['docPrefix'] : null,
	};
})(withLocalize(TranslateLink));
