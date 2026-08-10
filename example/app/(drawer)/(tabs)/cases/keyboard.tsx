/**
 * Case: the keyboard and focused inputs.
 *
 * The keyboard is drawn by the OS in its own window, so it is not in the capture
 * — it changes appearance instantly while the app animates. The FIELD is in the
 * capture, cursor and selection included, which is why a focused input can look
 * as though it briefly has two carets during a long transition.
 */
import { useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { CaseIntro, NextCase, QuickSwitch } from '@/components/CaseScreen';
import {
  Body,
  Button,
  Callout,
  Card,
  Hint,
  Row,
  Screen,
  SectionTitle,
  useStyles,
} from '@/components/ui';
import { useTheme } from '@/theme/store';
import type { Theme } from '@/theme/themes';
import { cycleTheme } from '@/theme/transition';

export default function KeyboardCase() {
  const theme = useTheme();
  const styles = useStyles(makeStyles);
  const inputRef = useRef<TextInput>(null);
  const [value, setValue] = useState('Type here, then switch the theme');
  const [note, setNote] = useState('—');

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <Screen>
        <CaseIntro
          slug="keyboard"
          expect="The field, its text and its caret animate with the rest of the screen. The keyboard itself re-tints in a single frame, and focus is never lost."
        />

        <SectionTitle>Focused input</SectionTitle>
        <Card subtitle="keyboardAppearance follows the theme, so the OS keyboard flips too — instantly.">
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={setValue}
            multiline
            style={styles.input}
            placeholder="Anything at all"
            placeholderTextColor={theme.muted}
            keyboardAppearance={theme.isDark ? 'dark' : 'light'}
            selectionColor={theme.tint}
          />

          <Row gap={10} wrap>
            <Button
              label="Focus, then switch"
              icon="create-outline"
              style={styles.grow}
              onPress={() => {
                inputRef.current?.focus();
                setTimeout(() => {
                  cycleTheme();
                  setNote('Switched with the keyboard up — focus kept.');
                }, 350);
              }}
            />
            <Button
              label="Switch, then dismiss"
              icon="chevron-down-outline"
              variant="secondary"
              style={styles.grow}
              onPress={() => {
                cycleTheme();
                setTimeout(() => {
                  Keyboard.dismiss();
                  setNote('Keyboard dismissed mid-transition — the snapshot still shows it.');
                }, 150);
              }}
            />
          </Row>

          <Hint>{note}</Hint>
        </Card>

        <SectionTitle>Second field</SectionTitle>
        <View style={styles.fieldRow}>
          <TextInput
            style={[styles.input, styles.flex]}
            placeholder="Single line"
            placeholderTextColor={theme.muted}
            keyboardAppearance={theme.isDark ? 'dark' : 'light'}
            selectionColor={theme.tint}
            returnKeyType="done"
          />
        </View>

        <Callout tone="warn" title="Layout changes mid-capture">
          On Android the window resizes when the keyboard appears. A capture taken during that
          resize is laid out to the bounds it had at that instant and does not follow the change —
          another reason short durations are safer.
        </Callout>

        <Body style={{ marginTop: 14 }}>
          Nothing here needs special handling from the app. It is listed as a case because a focused
          field is the most common place to notice that the copy is a copy.
        </Body>

        <QuickSwitch />
        <NextCase slug="keyboard" />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
    fieldRow: { marginTop: 12 },
    flex: { flex: 1 },
    grow: { flexBasis: '46%', flexGrow: 1 },
    input: {
      backgroundColor: theme.surfaceAlt,
      borderColor: theme.border,
      borderRadius: 10,
      borderWidth: 1,
      color: theme.text,
      fontSize: 14,
      minHeight: 64,
      padding: 12,
    },
  });
