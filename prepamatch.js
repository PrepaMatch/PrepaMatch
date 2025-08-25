// ----- Configuration Supabase (projet d'origine) -----
const SUPABASE_URL = 'https://jbtcnvzgmkyvwxmpcqce.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpidGNudnpnbWt5dnd4bXBjcWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NjExOTUsImV4cCI6MjA2NzUzNzE5NX0.updg9ZCqyTh8pSGZO9qj8j12mVQJla9GZHTBZNe8X5Q';

let supabaseClient = null;

// ----- Boot -----
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
  try {
    if (typeof supabase === 'undefined') throw new Error('Supabase non chargé');
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Date minimale = aujourd'hui
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('dateTrajet');
    if (dateInput) dateInput.setAttribute('min', today);

    await chargerTrajets();
  } catch (e) {
    console.error('Init error:', e);
    showError("Erreur d'initialisation de l'application", e.message || String(e));
  }
}

// ----- UI helpers -----
function showLoading() {
  const container = document.getElementById('trajetsContainer');
  if (!container) return;
  container.innerHTML = `
    <div class="col-12">
      <div class="loading">
        <i class="fas fa-spinner fa-spin fa-2x mb-3"></i>
        <p>Chargement des trajets...</p>
      </div>
    </div>
  `;
}

function showError(title, message) {
  const container = document.getElementById('trajetsContainer');
  if (!container) return;
  container.innerHTML = `
    <div class="col-12">
      <div class="alert alert-danger" role="alert">
        <h4 class="alert-heading"><i class="fas fa-exclamation-triangle me-2"></i>${escapeHtml(title)}</h4>
        <p>${escapeHtml(message || '')}</p>
        <hr>
        <p class="mb-0">
          <button class="btn btn-outline-danger" onclick="location.reload()">
            <i class="fas fa-redo me-2"></i>Recharger la page
          </button>
        </p>
      </div>
    </div>
  `;
}

function showSuccess(message) {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed';
  alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
  alertDiv.innerHTML = `
    <i class="fas fa-check-circle me-2"></i>
    ${escapeHtml(message)}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(alertDiv);
  setTimeout(() => alertDiv.remove(), 5000);
}

function escapeHtml(text) {
  if (text === null || text === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(text);
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (isNaN(date)) return escapeHtml(dateString || '');
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// ----- Data -----
async function chargerTrajets() {
  try {
    showLoading();
    if (!supabaseClient) throw new Error('Supabase non initialisé');

    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabaseClient
      .from('trajets')
      .select('*')
      .gte('date_trajet', today)
      .order('date_trajet', { ascending: true })
      .order('heure_depart', { ascending: true });

    if (error) throw error;

    afficherTrajets(data || []);
  } catch (e) {
    console.error('Load error:', e);
    showError('Impossible de charger les trajets', e.message || String(e));
  }
}

function afficherTrajets(trajets) {
  const container = document.getElementById('trajetsContainer');
  if (!container) return;

  if (!trajets || trajets.length === 0) {
    container.innerHTML = `
      <div class="col-12">
        <div class="no-trajets">
          <i class="fas fa-car fa-3x mb-3 opacity-50"></i>
          <h3>Aucun trajet disponible</h3>
          <p>Soyez le premier à proposer un trajet !</p>
          <button class="btn btn-primary mt-3" data-bs-toggle="modal" data-bs-target="#ajouterTrajetModal">
            <i class="fas fa-plus me-2"></i>Proposer un trajet
          </button>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = trajets.map(trajet => `
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="card card-trajet h-100" onclick="selectionnerTrajet(${Number(trajet.id)})">
        <div class="card-body">
          <div class="profile-section">
            <div class="profile-avatar">
              ${escapeHtml((trajet.prenom || ' ')[0] || '')}${escapeHtml((trajet.nom || ' ')[0] || '')}
            </div>
            <div>
              <h6 class="mb-1">${escapeHtml(trajet.prenom)} ${escapeHtml(trajet.nom)}</h6>
              <small class="text-muted">
                <i class="fas fa-graduation-cap me-1"></i>
                ${escapeHtml(trajet.etablissement)}
              </small>
            </div>
          </div>

          <div class="trajet-info mb-3">
            <div class="trajet-path mb-2">
              <i class="fas fa-map-marker-alt me-1"></i>
              ${escapeHtml(trajet.ville_depart)} → ${escapeHtml(trajet.ville_arrivee)}
            </div>

            <div class="map-container">
              <div class="map-point start"></div>
              <div class="map-route"></div>
              <div class="map-point end"></div>
              <div class="position-absolute bottom-0 start-0 p-2">
                <small class="text-muted">${escapeHtml(trajet.ville_depart)}</small>
              </div>
              <div class="position-absolute bottom-0 end-0 p-2">
                <small class="text-muted">${escapeHtml(trajet.ville_arrivee)}</small>
              </div>
            </div>
          </div>

          <div class="d-flex flex-wrap gap-2 mb-3">
            <span class="info-badge">
              <i class="fas fa-calendar me-1"></i>
              ${formatDate(trajet.date_trajet)}
            </span>
            <span class="info-badge">
              <i class="fas fa-clock me-1"></i>
              ${escapeHtml(trajet.heure_depart)}
            </span>
            <span class="info-badge">
              <i class="fas fa-users me-1"></i>
              ${escapeHtml(trajet.nombre_places)} place${Number(trajet.nombre_places) > 1 ? 's' : ''}
            </span>
            ${trajet.prix != null && trajet.prix !== '' ? `
              <span class="info-badge">
                <i class="fas fa-euro-sign me-1"></i>
                ${escapeHtml(trajet.prix)}€
              </span>` : ''}
          </div>

          <div class="contact-info">
            <i class="fas fa-phone me-2"></i>
            <strong>Contact:</strong> ${escapeHtml(trajet.contact)}
          </div>

          ${trajet.informations_supplementaires ? `
            <div class="mt-3">
              <small class="text-muted">
                <i class="fas fa-info-circle me-1"></i>
                ${escapeHtml(trajet.informations_supplementaires)}
              </small>
            </div>` : ''}

          <button class="btn btn-danger" onclick="ouvrirSuppression(${trajet.id})">
            <i class="fas fa-trash"></i> Supprimer
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// Effet visuel / future redirection possible
function selectionnerTrajet(id) {
  console.log('Trajet sélectionné:', id);
}

// ----- Actions -----
async function ajouterTrajet() {
  try {
    const form = document.getElementById('ajouterTrajetForm');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (!supabaseClient) throw new Error('Base de données non initialisée');

    const formData = {
      nom: document.getElementById('nom').value.trim(),
      prenom: document.getElementById('prenom').value.trim(),
      etablissement: document.getElementById('etablissement').value.trim(),
      ville_depart: document.getElementById('villeDepart').value.trim(),
      ville_arrivee: document.getElementById('villeArrivee').value.trim(),
      date_trajet: document.getElementById('dateTrajet').value,
      heure_depart: document.getElementById('heureDepart').value,
      nombre_places: parseInt(document.getElementById('nombrePlaces').value, 10),
      prix: document.getElementById('prix').value ? parseFloat(document.getElementById('prix').value) : null,
      contact: document.getElementById('contact').value.trim(),
      informations_supplementaires: document.getElementById('informations').value.trim(),
      code_secret: document.getElementById('codeSecret').value
    };

    const { error } = await supabaseClient.from('trajets').insert([formData]);
    if (error) throw error;

    // Fermer modal + reset + reload + toast
    const modal = bootstrap.Modal.getInstance(document.getElementById('ajouterTrajetModal'));
    if (modal) modal.hide();
    form.reset();
    await chargerTrajets();
    showSuccess('Trajet publié avec succès !');
  } catch (e) {
    console.error('Ajout trajet error:', e);
    alert(`Erreur lors de la publication: ${e.message || String(e)}`);
  }
}

function ouvrirSuppression(trajetId) {
  document.getElementById('trajetIdSuppression').value = trajetId;
  document.getElementById('codeSuppression').value = '';
  const modal = new bootstrap.Modal(document.getElementById('supprimerTrajetModal'));
  modal.show();
}

async function supprimerTrajet() {
  try {
    const trajetId = document.getElementById('trajetIdSuppression').value;
    const code = document.getElementById('codeSuppression').value;
    if (!code) { alert('Veuillez entrer le code secret.'); return; }
    if (!supabaseClient) throw new Error('Base de données non initialisée');

    const { error } = await supabaseClient
      .from('trajets')
      .delete()
      .eq('id', trajetId)
      .eq('code_secret', code);

    if (error) throw error;

    const modal = bootstrap.Modal.getInstance(document.getElementById('supprimerTrajetModal'));
    if (modal) modal.hide();
    await chargerTrajets();
    showSuccess('Trajet supprimé avec succès !');
  } catch (e) {
    console.error('Suppression trajet error:', e);
    alert(`Erreur lors de la suppression: ${e.message || String(e)}`);
  }
}

function ouvrirSuppression(trajetId) {
  document.getElementById('trajetIdSuppression').value = trajetId;
  document.getElementById('codeSuppression').value = '';
  const modal = new bootstrap.Modal(document.getElementById('supprimerTrajetModal'));
  modal.show();
}

async function supprimerTrajet() {
  try {
    const trajetId = document.getElementById('trajetIdSuppression').value;
    const code = document.getElementById('codeSuppression').value.trim();

    if (!code) {
      alert('Veuillez entrer le code secret.');
      return;
    }

    const { data: trajet, error: fetchError } = await supabaseClient
      .from('trajets')
      .select('id')
      .eq('id', trajetId)
      .eq('code_secret', code)
      .single();

    if (fetchError || !trajet) {
      alert('Code secret incorrect ou trajet introuvable.');
      return;
    }

    const { error } = await supabaseClient
      .from('trajets')
      .delete()
      .eq('id', trajetId);

    if (error) throw error;

    const modal = bootstrap.Modal.getInstance(document.getElementById('supprimerTrajetModal'));
    if (modal) modal.hide();

    await chargerTrajets();
    alert('Trajet supprimé définitivement !');

  } catch (e) {
    console.error('Erreur suppression:', e);
    alert(`Impossible de supprimer le trajet : ${e.message || String(e)}`);
  }
}

chargerTrajets();

async function appliquerFiltres() {
  const depart = document.getElementById('filtreDepart').value.trim();
  const arrivee = document.getElementById('filtreArrivee').value.trim();
  const date = document.getElementById('filtreDate').value;

  try {
    showLoading();
    if (!supabaseClient) throw new Error('Supabase non initialisé');

    let query = supabaseClient
      .from('trajets')
      .select('*')
      .order('date_trajet', { ascending: true })
      .order('heure_depart', { ascending: true });

    if (depart) query = query.eq('ville_depart', depart);
    if (arrivee) query = query.eq('ville_arrivee', arrivee);
    if (date) query = query.eq('date_trajet', date);
    else {
      // Par défaut : uniquement trajets futurs
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('date_trajet', today);
    }

    const { data, error } = await query;
    if (error) throw error;

    afficherTrajets(data || []);
  } catch (e) {
    console.error('Filtre error:', e);
    showError('Impossible de charger les trajets filtrés', e.message || String(e));
  }
}
