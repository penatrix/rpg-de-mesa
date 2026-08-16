import { useEffect } from 'react';

import { useStore } from './store.js';
import { applyTheme } from './theme.js';
import { playTrack, stopMusic } from './audio/music.js';
import { HomeScreen } from './screens/HomeScreen.js';
import { CharacterCreation } from './screens/CharacterCreation.js';
import { TableScreen } from './screens/TableScreen.js';

export function App() {
  const screen = useStore((s) => s.screen);
  const setting = useStore((s) => s.setting);
  const error = useStore((s) => s.error);
  const clearError = useStore((s) => s.clearError);
  const connect = useStore((s) => s.connect);
  const tryResume = useStore((s) => s.tryResume);
  const trackId = useStore((s) => s.table?.scene.trackId);
  const musicEnabled = useStore((s) => s.table?.config.musicEnabled ?? false);

  // Conecta e tenta retomar o assento salvo antes de mostrar a tela inicial.
  useEffect(() => {
    connect();
    void tryResume();
  }, [connect, tryResume]);

  useEffect(() => {
    applyTheme(setting);
  }, [setting]);

  // A trilha segue a cena: o Mestre troca a faixa e todos ouvem a mudança.
  useEffect(() => {
    if (!musicEnabled || !setting || !trackId) {
      stopMusic();
      return;
    }
    const track = setting.tracks.find((t) => t.id === trackId);
    if (track) playTrack(track);
  }, [trackId, musicEnabled, setting]);

  // Mensagens de erro somem sozinhas — não valem um clique para dispensar.
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(clearError, 6000);
    return () => clearTimeout(timer);
  }, [error, clearError]);

  return (
    <>
      {error && (
        <div className="error-banner" role="alert" onClick={clearError}>
          {error}
        </div>
      )}
      {screen === 'home' && <HomeScreen />}
      {screen === 'character' && <CharacterCreation />}
      {screen === 'table' && <TableScreen />}
    </>
  );
}
