import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

function WeaknessModal({ weaknesses, onClose, onNavigate }) {
  const { t } = useTranslation();

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card weakness-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>{t('detail.close')}</button>
        <h3>{t('profile.weakness.title')}</h3>

        {weaknesses.length === 0 ? (
          <p className="label">{t('profile.weakness.none')}</p>
        ) : (
          <div className="weakness-list">
            {weaknesses.map((w) => (
              <div key={w.dimension} className="weakness-item">
                <div>
                  <div className="weakness-item-title">{t(`profile.weakness.${w.key}.title`)}</div>
                  <p className="label">{t(`profile.weakness.${w.key}.text`)}</p>
                </div>
                <button
                  className="refresh"
                  onClick={() => {
                    onNavigate(w.tab);
                    onClose();
                  }}
                >
                  {t(`profile.weakness.${w.key}.action`)}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default WeaknessModal;
