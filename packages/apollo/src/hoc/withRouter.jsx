import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

const withRouter = (Component) => {
	const ComponentWithRouterProp = (props) => {
		const location = useLocation();
		const navigate = useNavigate();
		const history = {
			push: (to, options) => {
				if (!to.includes("undefined")) {
					navigate(to, options)
				}
			},
			location: location,
			goBack: () => {
				navigate(-1);
			}
		};
		const params = useParams();

		return <Component {...props} match={{ params }} location={location} navigate={navigate} params={params} history={history} />;
	}

	return ComponentWithRouterProp;
}

export default withRouter;
