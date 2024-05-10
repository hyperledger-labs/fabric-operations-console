import PropTypes from 'prop-types';
import React from 'react';
const RenderHTML = ({value}) => {
	return <span dangerouslySetInnerHTML={{__html: value}}></span>
};

RenderHTML.propTypes = {
	value: PropTypes.string,
}



export default RenderHTML
