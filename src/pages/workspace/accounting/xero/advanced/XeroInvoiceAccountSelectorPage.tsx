import React, {useCallback, useMemo} from 'react';
import {View} from 'react-native';
import HeaderWithBackButton from '@components/HeaderWithBackButton';
import ScreenWrapper from '@components/ScreenWrapper';
import SelectionList from '@components/SelectionList';
import RadioListItem from '@components/SelectionList/RadioListItem';
import type {ListItem} from '@components/SelectionList/types';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useThemeStyles from '@hooks/useThemeStyles';
import * as Connections from '@libs/actions/connections';
import Navigation from '@libs/Navigation/Navigation';
import AccessOrNotFoundWrapper from '@pages/workspace/AccessOrNotFoundWrapper';
import type {WithPolicyConnectionsProps} from '@pages/workspace/withPolicyConnections';
import withPolicyConnections from '@pages/workspace/withPolicyConnections';
import CONST from '@src/CONST';
import ROUTES from '@src/ROUTES';

type SelectorType = ListItem & {
    value: string;
};

function XeroInvoiceAccountSelectorPage({policy}: WithPolicyConnectionsProps) {
    const styles = useThemeStyles();
    const {translate} = useLocalize();

    const policyID = policy?.id ?? '';
    const {bankAccounts} = policy?.connections?.xero?.data ?? {};

    const {invoiceCollectionsAccountID} = policy?.connections?.xero?.config.sync ?? {};

    const xeroSelectorOptions = useMemo<SelectorType[]>(
        () =>
            (bankAccounts ?? []).map(({id, name}) => ({
                value: id,
                text: name,
                keyForList: id,
                isSelected: invoiceCollectionsAccountID === id,
            })),
        [invoiceCollectionsAccountID, bankAccounts],
    );

    const listHeaderComponent = useMemo(
        () => (
            <View style={[styles.pb2, styles.ph5]}>
                <Text style={[styles.pb5, styles.textNormal]}>{translate('workspace.xero.advancedConfig.invoiceAccountSelectDescription')}</Text>
            </View>
        ),
        [translate, styles.pb2, styles.ph5, styles.pb5, styles.textNormal],
    );

    const initiallyFocusedOptionKey = useMemo(() => xeroSelectorOptions?.find((mode) => mode.isSelected)?.keyForList, [xeroSelectorOptions]);

    const updateMode = useCallback(
        ({value}: SelectorType) => {
            Connections.updatePolicyConnectionConfig(policyID, CONST.POLICY.CONNECTIONS.NAME.XERO, CONST.XERO_CONFIG.INVOICE_COLLECTION_ACCOUNT_ID, value);
            Navigation.goBack(ROUTES.POLICY_ACCOUNTING_XERO_ADVANCED.getRoute(policyID));
        },
        [policyID],
    );

    return (
        <AccessOrNotFoundWrapper
            policyID={policyID}
            accessVariants={[CONST.POLICY.ACCESS_VARIANTS.ADMIN, CONST.POLICY.ACCESS_VARIANTS.PAID]}
            featureName={CONST.POLICY.MORE_FEATURES.ARE_CONNECTIONS_ENABLED}
        >
            <ScreenWrapper
                includeSafeAreaPaddingBottom={false}
                testID={XeroInvoiceAccountSelectorPage.displayName}
            >
                <HeaderWithBackButton title={translate('workspace.xero.advancedConfig.xeroInvoiceCollectionAccount')} />

                <SelectionList
                    sections={[{data: xeroSelectorOptions}]}
                    ListItem={RadioListItem}
                    headerContent={listHeaderComponent}
                    onSelectRow={updateMode}
                    initiallyFocusedOptionKey={initiallyFocusedOptionKey}
                />
            </ScreenWrapper>
        </AccessOrNotFoundWrapper>
    );
}

XeroInvoiceAccountSelectorPage.displayName = 'XeroInvoiceAccountSelectorPage';

export default withPolicyConnections(XeroInvoiceAccountSelectorPage);
