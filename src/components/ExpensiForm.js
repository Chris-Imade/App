import React from 'react';
import _ from 'underscore';
import PropTypes from 'prop-types';
import * as FormAction from '../libs/actions/ExpensiForm';
import {ScrollView, View} from 'react-native';
import styles from '../styles/styles';

const propTypes = {
    name: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,

    // eslint-disable-next-line react/forbid-prop-types
    defaultValues: PropTypes.object,

    validate: PropTypes.func.isRequired,
    saveDraft: PropTypes.bool,
};

const defaultProps = {
    defaultValues: {},
    saveDraft: true,
};

class ExpensiForm extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            isLoading: false,
            errors: {},
            alert: {},
        };

        this.inputRefs = {};

        this.getFormValues = this.getFormValues.bind(this);
        this.saveDraft = this.saveDraft.bind(this);
        this.onSubmit = this.onSubmit.bind(this);
        this.validateForm = this.validateForm.bind(this);
        this.validateField = this.validateField.bind(this);
        this.clearInputErrors = this.clearInputErrors.bind(this);
        this.setLoading = this.setLoading.bind(this);
        this.setFormAlert = this.setFormAlert.bind(this);
    }

    getFormValues() {
        const formData = {};
        _.each(_.keys(this.inputRefs), (key) => {
            formData[key] = this.inputRefs[key].value;
        });
        return formData;
    }

    saveDraft(draft) {
        if (!this.props.saveDraft) {
            return;
        }
        FormAction.saveFormDraft(`${this.props.name}_draft`, {...draft});
    }

    validateField(fieldName) {
        const fieldError = this.props.validate({[fieldName]: this.inputRefs[fieldName].value})[fieldName];
        if (fieldError) {
            this.setState(prevState => ({
                errors: {
                    ...prevState.errors,
                    [fieldName]: fieldError,
                }
            }));
        };
    }

    validateForm() {
        const values = this.getFormValues();
        // validate takes in form values and returns errors object in the format
        // {username: 'form.errors.required', name: 'form.errors.tooShort', ...}
        // how do we handle multiple errors in this case???

        // We check if we are trying to validate a single field or the entire form
        const errors = this.props.validate(values);
        if (!_.isEmpty(errors)) {
            this.setState({
                errors,
                alert: {
                    firstErrorToFix: this.inputRefs[_.keys(errors)[0]],
                }
            });
        }
        return errors;
    }

    // Should be called onFocus
    clearInputErrors(field) {
        this.setState(prevState => ({
            errors: {
                ...prevState.errors,
                [field]: undefined,
            },
        }));
    }

    setLoading(value) {
        this.setState({isLoading: value})
    }

    setFormAlert(alert) {
        this.setState({alert});
    }

    onSubmit() {
        const values = this.getFormValues();
        const errors = this.validateForm();
        if (!_.isEmpty(errors)) {
            return;
        }
        this.props.onSubmit(values, {setLoading: this.setLoading, setFormAlert: this.setFormAlert})
    }

    render() {
        const childrenWrapperWithProps = children => (
            React.Children.map(children, (child) => {
                // Do nothing if child is not a valid React element
                if (!React.isValidElement(child)) {
                    return child;
                }

                // Depth first traversal of the render tree as the form element is likely to be the last node
                if (child.props.children) {
                    child = React.cloneElement(child, {
                        children: childrenWrapperWithProps(child.props.children),
                    });
                }

                // We check if the component has the EXPENSIFORM_COMPATIBLE_INPUT static property enabled,
                // as we don't want to pass form props to non form components, e.g. View, Text, etc
                if (!child.type.EXPENSIFORM_COMPATIBLE_INPUT && !child.type.EXPENSIFORM_SUBMIT_INPUT) {
                    return child;
                }

                // // We clone the child passing down all submit input props
                if (child.type.EXPENSIFORM_SUBMIT_INPUT) {
                    return React.cloneElement(child, {
                        onSubmit: this.onSubmit,
                        alert: this.state.alert,
                        isLoading: this.state.isLoading,
                    });
                }

                // We clone the child passing down all form props
                // We should only pass refs to class components!
                return React.cloneElement(child, {
                    ref: node => this.inputRefs[child.props.name] = node,
                    saveDraft: this.saveDraft,
                    validateField: this.validateField,
                    clearInputErrors: this.clearInputErrors,
                    defaultValue: this.props.defaultValues[child.props.name],
                    errorText: this.state.errors[child.props.name],
                });
            })
        );

        return (
            <>
                <ScrollView
                    style={[styles.w100, styles.flex1]}
                    contentContainerStyle={styles.flexGrow1}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Form elements */}
                    <View style={[this.props.style]}>
                        {childrenWrapperWithProps(this.props.children)}
                    </View>
                </ScrollView>
            </>
        );
    }
}

ExpensiForm.propTypes = propTypes;
ExpensiForm.defaultProps = defaultProps;

export default ExpensiForm;