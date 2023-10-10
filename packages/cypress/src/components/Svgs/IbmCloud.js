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
import SvgContainer from './SvgContainer';

const IbmCloud = ({ extendClass, height, title, width }) => {
	return (
		<SvgContainer width={width || '24px'}
			height={height || '21px'}
			extendClass={extendClass}
			viewBox="0 0 24 21"
		>
			<title>{title}</title>
			<g stroke="none"
				strokeWidth="1"
				fill="none"
				fillRule="evenodd"
			>
				<g transform="translate(-933.000000, -544.000000)">
					<g transform="translate(832.000000, 456.000000)">
						<image
							x="101"
							y="88"
							width="24"
							height="24"
							xlinkHref="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvm
							HAAAABGdBTUEAALGOfPtRkwAACZZJREFUaAXtWXlslMcVfzPz7beHL4wxxhwBY5vLHAkYcSkEq9w
							SaaEJCiWotFBaJKoktPkjrao4CRCpf0SqkkoJf3CkSRNAVSJIRJqgxAEajpi7jjlsbIjB+OCwvWt/
							u9838/q+XT6zXtaw67iilRhpPcd78+b9vnnz3psxwMPSzRdAZAtaK3+3sKVyWTccvTLMe0VKHCGLo
							N6rJLyoANbFIffakNZrkmIEBRs4AwEKOcMYUq92k9qBqcdqR089UTUjUQ2UZIAyUW6AH+Pp2Uvw1O
							DEZwAkBYC+6Abu8e2beuz86EQWQYsA0C+Rssg4M1eD9C+kxdcmwu/wJAWAbPo94G4PMu1VR8C9aqW
							YTrug34vHps2q+cqjFN9kWqahUPzjfvzR9KQAHJ049GOzxf8Jc6c9NeXEpTnRgmLbocrKIAH+nEB8
							GUuL7fsy+6/UvJmTZDD49h59zPFY+r36ie1vlITHjtRNcHlchzFk/Duou2ednjAgEEVOujmn6exAo
							bNvGQfmYq7HdqcOb0hGSFI7YAs+MWXwKctvvCPSs4tFIDg1mcXi8/InXenZA2VQbkhWeVtej9yoCq
							nSUMutch6wymOVKqqo0DNYZq5COYBZoVSusRAydRNMaJw7Pr+5lDEKDXeKZLgn2Hy9LaMRd90ZTby
							VtAnFE120s0J3D80sEZpaQn7nCcYxX6R4NFAWoGn4qd9AJnIZACuA4WHqHzo4YsTFeLKSHfuhANiE
							r68sFTp/Ufi8k0CFyG0aVZzDcc5VlWLYTOHMAKa8XLAsxjCHfj4U0EzhrRysYNnBoiIC1vPSCWD4h
							00jmMu3Hoz2HdXLs7+6n8ix/7wyROjiLyI1ZbEy/AEuYCtw+X56h3myrCTPiDd/Vk2Nx/CbeQR4PE
							M2jID5KVgf9be1nTxWXGzGmxM9tuDW2adAqB9pKP60J31ks027A2B782zwer+wTZQpaytgaGPVMzn
							V0QKcdtHe+snMpX0gfL587Gj7kKH18qnZg8879ETqKWcu5nAmH+UaZICLX0xX6szewsJgvLnzmi5M
							RA1L9TTfIsvfZgBnj36WPuqczdsJwO4M/dv16VyIV4QvdTYG/bdQWn/2aurNiqX9/TbdLiN210/Wd
							P0TLnhflMbzFfNz/xqh9OAvZazTquvywQz2BwWN7sbva8tKSixH0uP1F7JdCC9xna8TbpcLzeAOga
							FX92YVfefwdHGjl1ZkfVNzPmOe9LeuQAXNIj1rU4eF8xzm/I+vDGGo70DUMs0OY/kPUt4WSgfiUMG
							QKlDus8pC40bfvm5nLbvmIVit9+v/Appw0vR3LPy8b+Ez0cqHeaInhNulTNU82/e9UIBNsdr8T1vo
							jkTSnShYUH8LXKl5ZsB47tyTuTvvmtvDgT66EQhJCCJj+qTycpcjRnD1bqj55hJp8Jlf5o7c64xH1
							11MKJoQ2877+/Wlwpe2AztaPqhelv2zWHpSfTKdyd/W5ijOC8gb5XEuB1BamUGuVhccTARsFEJWIF
							dH/jVqVNu9ZCcEYNjWGg+I9P0gtOHAVXHtsszaewm9F23cgUuZAmEMea08xlUaCm7ZrpaURwYqBTQ
							1gDM+jGjkcuEGueRPNQ//qCwvvmdLKBIjZk5HS00Aab5x+Rf9eqg8stGfXRrALVc+opVCAa0yKLDO
							zR+5UV7M7rjQUuRT5tdk8xRRDKh+ohBfMNvlEzOrqjbuLyj4PvbjJLQDg96+sYkJtpy7tIWXV6ZVx
							ApJpD9iz9V+ZCq5gikZhFBd1cLC1vvNm1VRkWpYnhW09ho671dp/d8eHDG0SwTvHkAp0u7UajkpXs
							F97m0kQF5tzHwWSlmnm7ufAg594J6rPq/ELN1jWpWtRxth6dIk7mkA087ULqbdeJ3M7Jyewn5O5nT
							Lkd3FjTqDKRsbcvq4bw3uk9HHE9L1LLqUaCjFoZ4oD2QSvpaAhiFva+XhbQ3JKm/rdGjcsI/oXvEG
							SjYt2IbrHT3tuisA8g6ZG9vGuoRvJF0FxS1fdUAD4aaJrZaSF6InJtzOPSaMxibz4tOZbVBa2iUTT
							VgGMXpv1m6RkpWhYqumn6oa68ztAiDjtfaJKLEYLd7eIjMuwa+LTWUyoSzWrNDd5ExKqt53UdUdqg
							tR0Oqx8vZ6doRG4G+RNWRYSqxwdOgE4P1j+yBl8blKaUaL5TvtmItl6iGUvEGZqsOZlFS9a6mCXcn
							ZfHfylRpyiKzhNH3gBZPKr/qQLKYTAFPafEI3IGSFjpDyIUeIW1kBKeEaV5DUwXPmU91r70LHyN2S
							jt/QU00hw/bhJWVlFPeopL3UmoUWzgKL1Rsb+tRELQ5M9/vRgvpQB/aaItHyk23TGTiHKDzS0oZk9
							+9PcY6KJT35RMg3LTgbK7AhkNMhLbxqv/DE0h5EX1qsRSm6RUiW5r+kR0zICvEx9ASSjsCu3KUUJX
							esHRvMdssgl5hQ5L5LRi8OUGbqRQJAJh9MHVoQUYg8zzgAwRjjcW9SbWlprWC0SLheJUiXB7oTClk
							emPZxVNcudhzDsAmhySqkBSkqaKXF/Vj2oQ40tcO10AM/B/ROMINeRZoMJqoXTZokwwCkEufJPel0
							DkbFBWAPvvk+JVwVNvTu049uJ/cOgfKpUYj6DCn5gfMlA8NPNGEA9GZDJ5s1U6Sj2xdltXELRVHbp
							z/Awkz2HL3NeimwbnfUiADYyproTroPkJfAr2CmQ4xT2yb0QMwob2fDHBQpq6xA+9epg3I6b2cRAL
							amAjbT33YCsgHWYD976H+l5G1vGM/BvZWygSCCWG8HNEe3OwA2s7P0bV8nQjHF3C0EItdhepD1sC3
							X54HLuxdBGyiN4Nqqn2Z3eb2OsXey/9XwMgH5Ayn9HdWv0Y58CttYXPf63wT2yOa2IhRqHdPEbyha
							tXMZWFuzMufd2DVjANwmr8LV1HqF/M1Aqo8TkDJKvM8SmACZGiXhktkV0MWWLt+2+YULdW+3JYSTl
							NvjIjweOf+RdoRf8Ki5TDK6edETJOTRWtOp/bhISeUQ9B9ACP6+bnW/o5FZXf/GB2DzrMF8MqU11F
							pMQArD79gONxmeHcNtFLbS4bbdJ3pn2+FJtrZTLivQSg9n+1FT2+rLz+2Gzd0/OzoqdYUV3fslppH
							yhQTmERr2hUmUc4S/OikfSQepjrsTNt0OHVRsXvpFdktF2s44gQRagGuUCWhQT9fH6sbnUxP6R8f9
							AVCAIGOyl+ZwnRSPKQUx/XC3MN5gImNVkOEuUIvqQZZSDpbIjIc8D7/Awy/wf/4F/gMqtu4uaDMvw
							AAAAABJRU5ErkJggg=="
						/>
					</g>
				</g>
			</g>
		</SvgContainer>
	);
};

IbmCloud.propTypes = {
	extendClass: PropTypes.string,
	height: PropTypes.string,
	title: PropTypes.string,
	width: PropTypes.string,
};

export default IbmCloud;
