import { getAnalyticsSnapshot } from "../services/analytics.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(timestamp) {
  if (!timestamp) {
    return "never";
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "invalid date";
  }
  return date.toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
}

function buildStatsPage(snapshot) {
  const usersRows = snapshot.users.length
    ? snapshot.users
        .map(
          (entry) => `
            <tr>
              <td>${escapeHtml(entry.user)}</td>
              <td>${entry.adds}</td>
              <td>${entry.skips}</td>
              <td>${entry.totalCommands}</td>
            </tr>
          `
        )
        .join("")
    : `
      <tr>
        <td colspan="4">Aucune donnée pour le moment</td>
      </tr>
    `;

  const songsRows = snapshot.topTracks.length
    ? snapshot.topTracks
        .map(
          (track) => `
            <tr>
              <td>${escapeHtml(track.title || "Titre inconnu")}</td>
              <td>${escapeHtml(track.artist || "Artiste inconnu")}</td>
              <td>${Number(track.count || 0)}</td>
            </tr>
          `
        )
        .join("")
    : `
      <tr>
        <td colspan="3">Aucune donnée pour le moment</td>
      </tr>
    `;

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Statistiques Serveur</title>
    <style>
      :root { color-scheme: light; }
      body {
        font-family: "Segoe UI", Tahoma, sans-serif;
        margin: 24px;
        line-height: 1.4;
        background: #f7f7f8;
        color: #1f2937;
      }
      .card {
        background: #fff;
        border: 1px solid #d1d5db;
        border-radius: 10px;
        padding: 16px;
        margin-bottom: 16px;
      }
      .grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
      }
      @media (min-width: 980px) {
        .grid {
          grid-template-columns: 1fr 1fr;
          align-items: start;
        }
      }
      h1, h2 { margin-top: 0; }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        border: 1px solid #e5e7eb;
        padding: 8px;
        text-align: left;
      }
      th { background: #f3f4f6; }
      .muted { color: #6b7280; font-size: 0.95rem; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Statistiques du serveur Spotify Bot</h1>
      <p class="muted">Dernière mise à jour : ${escapeHtml(formatDate(snapshot.updatedAt))}</p>
      <p><strong>Total commandes :</strong> ${snapshot.totals.commands}</p>
      <p><strong>Total ajouts :</strong> ${snapshot.totals.adds}</p>
      <p><strong>Total skips :</strong> ${snapshot.totals.skips}</p>
    </div>

    <div class="grid">
      <div class="card">
        <h2>Utilisateurs</h2>
        <table>
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Ajouts</th>
              <th>Skips</th>
              <th>Total commandes</th>
            </tr>
          </thead>
          <tbody>
            ${usersRows}
          </tbody>
        </table>
      </div>

      <div class="card">
        <h2>Songs</h2>
        <table>
          <thead>
            <tr>
              <th>Titre</th>
              <th>Artiste</th>
              <th>Utilisations</th>
            </tr>
          </thead>
          <tbody>
            ${songsRows}
          </tbody>
        </table>
      </div>
    </div>
  </body>
</html>`;
}

export function registerStatsRoute(app) {
  const renderServerStats = (_req, res) => {
    const snapshot = getAnalyticsSnapshot(200);
    return res.type("html").send(buildStatsPage(snapshot));
  };

  app.get("/stats", (req, res) => {
    const requestedLimit = Number(req.query?.top || 20);
    const topLimit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(200, requestedLimit)) : 20;
    return res.json(getAnalyticsSnapshot(topLimit));
  });

  app.get("/server-stats", renderServerStats);
  app.get("/stats-serveur", renderServerStats);
  app.get("/stats_serveur", (_req, res) => res.redirect(302, "/server-stats"));
}
