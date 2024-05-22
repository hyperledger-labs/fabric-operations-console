import React from 'react';
import PropTypes from 'prop-types';

const RenderParamHTML = (translate, transKey, mapping) => {
	let message = translate(transKey);
	if(message === transKey) {
		return transKey;
	}
	const doms = [];
	for (const key in mapping) {
		let parts = message.split(`{{${key}}}`);
		if(doms.length) {
			doms.pop();
		}
		message = message.replace(`${parts[0]}{{${key}}}`, '');

		doms.push(parts[0]);
		doms.push({component: mapping[key], type: 'component'});
		doms.push(parts[1]);
	}

	return <span>{doms.map(elem => elem?.type === 'component' ? elem.component : <span dangerouslySetInnerHTML={{__html: elem}}></span>)}</span>
};

RenderParamHTML.propTypes = {
	translate: PropTypes.func,
	transKey: PropTypes.string,
	mapping: PropTypes.object
}



export default RenderParamHTML
