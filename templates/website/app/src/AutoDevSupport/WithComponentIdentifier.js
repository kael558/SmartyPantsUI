import React from "react";

function withComponentIdentifier(Component, filename) {
	return function WrappedComponent(props) {

		return (
			<div data-component={filename}>
				<Component {...props} />
			</div>
		);
	};
}

export default withComponentIdentifier;
