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
import { SkeletonText } from 'carbon-components-react';
import PropTypes from 'prop-types';
import React from 'react';
import { withTranslation } from 'react-i18next';

const ReleaseNotes = props => {
	const loading = props.loading || !props.releaseNotes || !props.releaseNotes.length;
	const releaseNotes = props.releaseNotes ? props.releaseNotes : [];
	const translate = props.t;
	return (
		<div>
			<div className="ipb-note-header-container">
				<h2 id="Release Notes"
					className="settings-label ibp-note-header"
				>
					{translate('product_label_notes')}
				</h2>
				<div className="ipb-note-current">
					{loading && (
						<div>
							<SkeletonText />
							<SkeletonText />
						</div>
					)}
				</div>
			</div>
			<div className="ibp-note-table-container">
				{releaseNotes.map((note, i) => {
					return (
						<div key={note.version}>
							<hr />
							<div className="ibp-note-container">
								<div className="ibp-note-date">
									<p className="ibp-note-version">
										{loading && <SkeletonText />}
										{!loading && <div>{note.version}</div>}
									</p>
									{loading && <SkeletonText />}
									{!loading && <p className="ibp-note-date">{note.date}</p>}
								</div>
								{loading && <SkeletonText />}
								{!loading && (
									<div className="ibp-note-descrption">
										<ul>
											{note.description.map(desc => {
												return (
													<li className="ibp-note-bullet"
														key={desc.title}
													>
														{' '}
														<div className="ibp-note-bullet-point">-</div>
														<div className="ibp-note-bullet-text">
															<strong>{desc.title}: </strong>
															<span>{desc.details}</span>
														</div>
													</li>
												);
											})}
										</ul>
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

ReleaseNotes.propTypes = {
	loading: PropTypes.bool,
	releaseNotes: PropTypes.object,
	t: PropTypes.func, // Provided by withTranslation()
};

export default withTranslation()(ReleaseNotes);
