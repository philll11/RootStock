import { registerRootComponent } from 'expo';
import { notify, appControl } from '@rootstock/shared/util';
import { mobileNotificationAdapter, mobileAppControl } from '@rootstock/ui/mobile';

notify.setAdapter(mobileNotificationAdapter);
appControl.setAdapter(mobileAppControl);

import App from './src/app/App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
