import PropTypes from 'prop-types';
import React, {useEffect, useMemo, useState} from 'react';
import {View} from 'react-native';
import {withOnyx} from 'react-native-onyx';
import _ from 'underscore';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import {usePersonalDetails} from '@components/OnyxProvider';
import ScreenWrapper from '@components/ScreenWrapper';
import SelectionList from '@components/SelectionList';
import UserListItem from '@components/SelectionList/UserListItem';
import useDebouncedState from '@hooks/useDebouncedState';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import useThemeStyles from '@hooks/useThemeStyles';
import Navigation from '@libs/Navigation/Navigation';
import * as OptionsListUtils from '@libs/OptionsListUtils';
import Performance from '@libs/Performance';
import * as ReportUtils from '@libs/ReportUtils';
import reportPropTypes from '@pages/reportPropTypes';
import * as Report from '@userActions/Report';
import Timing from '@userActions/Timing';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import SearchPageFooter from './SearchPageFooter';

const propTypes = {
    /* Onyx Props */

    /** Beta features list */
    betas: PropTypes.arrayOf(PropTypes.string),

    /** All reports shared with the user */
    reports: PropTypes.objectOf(reportPropTypes),

    /** Whether or not we are searching for reports on the server */
    isSearchingForReports: PropTypes.bool,
};

const defaultProps = {
    betas: [],
    reports: {},
    isSearchingForReports: false,
};

const setPerformanceTimersEnd = () => {
    Timing.end(CONST.TIMING.SEARCH_RENDER);
    Performance.markEnd(CONST.TIMING.SEARCH_RENDER);
};

const SearchPageFooterInstance = <SearchPageFooter />;

function SearchPage({betas, reports, isSearchingForReports}) {
    const [isScreenTransitionEnd, setIsScreenTransitionEnd] = useState(false);
    const {translate} = useLocalize();
    const {isOffline} = useNetwork();
    const themeStyles = useThemeStyles();
    const personalDetails = usePersonalDetails();
    const [options, setOptions] = useState({
        recentReports: [],
        personalDetails: [],
        betas: [],
    });
    const [filteredOptions, setFilteredOptions] = useState({});

    const offlineMessage = isOffline ? [`${translate('common.youAppearToBeOffline')} ${translate('search.resultsAreLimited')}`, {isTranslated: true}] : '';

    const [searchValue, debouncedSearchValue, setSearchValue] = useDebouncedState('');

    useEffect(() => {
        Timing.start(CONST.TIMING.SEARCH_RENDER);
        Performance.markStart(CONST.TIMING.SEARCH_RENDER);
    }, []);

    useEffect(() => {
        Report.searchInServer(debouncedSearchValue.trim());
    }, [debouncedSearchValue]);

    useEffect(() => {
        if (!isScreenTransitionEnd) {
            return;
        }

        const searchOptions = OptionsListUtils.getSearchOptions(reports, personalDetails, '', betas);
        setOptions(searchOptions);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isScreenTransitionEnd]);

    useEffect(() => {
        if (debouncedSearchValue.trim() === '') {
            if(!_.isEmpty(filteredOptions)) {
                setFilteredOptions({});
            }

            return;
        }

        const filteredResults = OptionsListUtils.filterOptions(options, debouncedSearchValue);
        setFilteredOptions(filteredResults);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearchValue]);

    const {
        recentReports,
        personalDetails: localPersonalDetails,
        userToInvite,
        headerMessage,
    } = useMemo(() => {
        if (!isScreenTransitionEnd) {
            return {
                recentReports: [],
                personalDetails: [],
                userToInvite: {},
                headerMessage: '',
            };
        }

        let listOptions = options;

        if (searchValue !== '' && filteredOptions.length > 0) {
            listOptions = {
                recentReports: filteredOptions,
                personalDetails: [],
                userToInvite: {},
                headerMessage: '',
            };
        } else if (searchValue !== '' && filteredOptions.length === 0) {
            listOptions = {
                recentReports: [],
                personalDetails: [],
                userToInvite: null,
            };
        }
        const header = OptionsListUtils.getHeaderMessage(
            listOptions.recentReports.length + listOptions.personalDetails.length !== 0,
            Boolean(listOptions.userToInvite),
            debouncedSearchValue,
        );
        return {...listOptions, headerMessage: header};
    }, [debouncedSearchValue, filteredOptions, isScreenTransitionEnd, options, searchValue]);

    const sections = useMemo(() => {
        const newSections = [];
        let indexOffset = 0;

        if (recentReports.length > 0) {
            newSections.push({
                data: recentReports,
                shouldShow: true,
                indexOffset,
            });
            indexOffset += recentReports.length;
        }

        if (localPersonalDetails.length > 0) {
            newSections.push({
                data: localPersonalDetails,
                shouldShow: true,
                indexOffset,
            });
            indexOffset += recentReports.length;
        }
        if (!_.isEmpty(userToInvite)) {
            newSections.push({
                data: [userToInvite],
                shouldShow: true,
                indexOffset,
            });
        }

        return newSections;
    }, [localPersonalDetails, recentReports, userToInvite]);

    const selectReport = (option) => {
        if (!option) {
            return;
        }

        if (option.reportID) {
            setSearchValue('');
            Navigation.dismissModal(option.reportID);
        } else {
            Report.navigateToAndOpenReport([option.login]);
        }
    };

    const handleScreenTransitionEnd = () => {
        setIsScreenTransitionEnd(true);
    };

    const isOptionsDataReady = useMemo(() => ReportUtils.isReportDataReady() && OptionsListUtils.isPersonalDetailsReady(personalDetails), [personalDetails]);

    return (
        <ScreenWrapper
            includeSafeAreaPaddingBottom={false}
            testID={SearchPage.displayName}
            onEntryTransitionEnd={handleScreenTransitionEnd}
            shouldEnableMaxHeight
        >
            {({didScreenTransitionEnd, safeAreaPaddingBottomStyle}) => (
                <>
                    <HeaderWithBackButton
                        title={translate('common.search')}
                        onBackButtonPress={Navigation.goBack}
                    />
                    <View style={[themeStyles.flex1, themeStyles.w100, safeAreaPaddingBottomStyle]}>
                        <SelectionList
                            sections={didScreenTransitionEnd && isOptionsDataReady ? sections : CONST.EMPTY_ARRAY}
                            ListItem={UserListItem}
                            textInputValue={searchValue}
                            textInputLabel={translate('optionsSelector.nameEmailOrPhoneNumber')}
                            textInputHint={offlineMessage}
                            onChangeText={setSearchValue}
                            headerMessage={headerMessage}
                            onLayout={setPerformanceTimersEnd}
                            autoFocus
                            onSelectRow={selectReport}
                            showLoadingPlaceholder={!didScreenTransitionEnd || !isOptionsDataReady}
                            footerContent={SearchPageFooterInstance}
                            isLoadingNewOptions={isSearchingForReports}
                        />
                    </View>
                </>
            )}
        </ScreenWrapper>
    );
}

SearchPage.propTypes = propTypes;
SearchPage.defaultProps = defaultProps;
SearchPage.displayName = 'SearchPage';

export default withOnyx({
    reports: {
        key: ONYXKEYS.COLLECTION.REPORT,
    },
    betas: {
        key: ONYXKEYS.BETAS,
    },
    isSearchingForReports: {
        key: ONYXKEYS.IS_SEARCHING_FOR_REPORTS,
        initWithStoredValues: false,
    },
})(SearchPage);
