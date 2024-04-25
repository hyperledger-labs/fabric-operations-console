import React from 'react';
import {
	useLocation,
	useNavigate,
	useParams,
} from 'react-router-dom';

const withRouter = Component => {
	const ComponentWithRouterProp = props => {
		let location = useLocation();
		let navigate = useNavigate();
		let params = useParams();
		return (
			<Component
				{...props}
				location={location}
				router={{ location, navigate, params }}
			/>
		);
	}

	return ComponentWithRouterProp;
}

export default withRouter;
