import React, { Component } from 'react'
import { ScrollView, Alert } from 'react-native'
import Switch from 'react-native-switch-pro'
import MixPanel from 'react-native-mixpanel'

import * as Utils from '../../components/Utils'
import ButtonGradient from './../../components/ButtonGradient'
import { PolicyText } from './elements'
import { Colors, Spacing } from './../../components/DesignSystem'
import tl from '../../utils/i18n'
import Async from './../../utils/asyncStorageUtils'
import { USER_PRIVACY } from './../../utils/constants'

class PrivacyPolicy extends Component {
  state = {
    userAccepted: false
  }

  async componentDidMount () {
    if (await Async.get(USER_PRIVACY, false)) {
      this.props.navigation.navigate('First', this.props.navigation.state)
    }
  }

  onPressConfirm = () => {
    if (!this.state.userAccepted) {
      Alert.alert(tl.t('warning'), tl.t('privacyPolicy.error'))
    } else {
      Async.set(USER_PRIVACY, 'true')
      this.props.navigation.navigate('First', this.props.navigation.state)
      MixPanel.track('Privacy Policy')
    }
  }

  render () {
    return (
      <Utils.SafeAreaView background={Colors.darkerBackground}>

        <Utils.Content
          paddingVertical='medium'
          paddingHorizontal='medium'
          flex={1}
        >
          <Utils.View
            align='center'
            background={Colors.dusk}
            paddingVertical={Spacing.medium}
            paddingHorizontal={Spacing.medium}
            borderRadius={8}
          >
            <Utils.View height='20%' align='center'>
              <Utils.VerticalSpacer size='medium' />
              <Utils.Text lineHeight={36} size='medium'>{tl.t('privacyPolicy.title')}</Utils.Text>
              <Utils.VerticalSpacer />
              <Utils.Text
                lineHeight={25}
                letterSpacing={0}
                size='smaller'
                numberOfLines={2}
                color={Colors.greyBlue}
                align='center'
                light
              >
                {tl.t('privacyPolicy.subtitle')}
              </Utils.Text>
              <Utils.VerticalSpacer size='small' />
              <Utils.View width={8} height={1} background={Colors.lemonYellow} />
              <Utils.VerticalSpacer size='small' />
            </Utils.View>

            <Utils.View height='60%'>
              <ScrollView>
                <PolicyText />
              </ScrollView>
              <Utils.VerticalSpacer size='medium' />
            </Utils.View>

            <Utils.View height='20%'>
              <Utils.Row align='center' justify='center'>
                <Switch
                  style={{ marginRight: 10 }}
                  circleStyle={{ backgroundColor: Colors.orange }}
                  backgroundActive={Colors.yellow}
                  backgroundInactive={Colors.secondaryText}
                  onSyncPress={userAccepted => {
                    this.setState({ userAccepted })
                  }}
                />
                <Utils.Text color={Colors.greyBlue} size='xsmall'>{tl.t('privacyPolicy.acceptTerms')}</Utils.Text>
              </Utils.Row>
              <Utils.VerticalSpacer />
              <ButtonGradient text={tl.t('privacyPolicy.continue')} onPress={this.onPressConfirm} />
            </Utils.View>

          </Utils.View>
        </Utils.Content>

      </Utils.SafeAreaView>
    )
  }
}

export default PrivacyPolicy
