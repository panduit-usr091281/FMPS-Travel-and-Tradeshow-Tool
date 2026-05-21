import React from 'react';
import {
  makeStyles,
  tokens,
  Text,
  Avatar,
  Button,
  Menu,
  MenuTrigger,
  MenuList,
  MenuItem,
  MenuPopover,
} from '@fluentui/react-components';
import { SignOut24Regular } from '@fluentui/react-icons';
import { useMsal } from '@azure/msal-react';

const useStyles = makeStyles({
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: `${tokens.spacingVerticalM} ${tokens.spacingHorizontalL}`,
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    boxShadow: tokens.shadow4,
  },
  titleSection: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
  },
  logo: {
    height: '32px',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
});

export const Header: React.FC = () => {
  const styles = useStyles();
  const { instance, accounts } = useMsal();
  const account = accounts[0];

  const handleLogout = () => {
    instance.logoutPopup();
  };

  return (
    <header className={styles.header}>
      <div className={styles.titleSection}>
        <Text size={500} weight="bold" style={{ color: 'white' }}>
          FMPS Marketing & Trade Show Coordination
        </Text>
      </div>
      <div className={styles.userSection}>
        {account && (
          <Menu>
            <MenuTrigger>
              <Button
                appearance="transparent"
                icon={<Avatar name={account.name} size={28} />}
                style={{ color: 'white' }}
              >
                {account.name}
              </Button>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem icon={<SignOut24Regular />} onClick={handleLogout}>
                  Sign Out
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        )}
      </div>
    </header>
  );
};
