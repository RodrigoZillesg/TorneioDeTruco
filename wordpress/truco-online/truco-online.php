<?php
/**
 * Plugin Name: Truco Online
 * Description: Jogo de Truco Paulista com efeitos visuais e sonoros, disponível em /jogo/. Contra a IA ou online com amigos.
 * Version: 2.4.1
 * Author: Rodrigo Zillesg
 */

if (!defined('ABSPATH')) {
    exit;
}

// Atualizar junto com a versão do plugin: evita que o navegador use arquivos antigos do cache
const TRUCO_ONLINE_VERSAO = '2.4.1';

// Serve o jogo em /jogo/ usando os arquivos estáticos do plugin
add_action('init', function () {
    $caminho = trim((string) parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH), '/');
    if ($caminho !== 'jogo') {
        return;
    }
    $html = file_get_contents(__DIR__ . '/jogo/index.html');
    // Caminhos relativos: funcionam tanto no domínio definitivo quanto no temporário
    $base = wp_make_link_relative(plugins_url('jogo/', __FILE__));
    $relay = wp_make_link_relative(plugins_url('relay.php', __FILE__));
    $cabecalho = "\n  <base href=\"" . esc_url($base) . "\" />" .
        "\n  <script>window.TRUCO_RELAY = " . wp_json_encode($relay) . ";</script>";
    $html = str_replace('<head>', '<head>' . $cabecalho, $html);
    $html = str_replace('<a class="btn btn-link" href="../">🏆 Torneios</a>', '', $html);
    $html = preg_replace('#(src|href)="((?:css|js|compartilhado)/[^"?]+)"#', '$1="$2?v=' . TRUCO_ONLINE_VERSAO . '"', $html);
    status_header(200);
    nocache_headers();
    header('Content-Type: text/html; charset=utf-8');
    echo $html;
    exit;
});
