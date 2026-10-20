<?php
/**
 * Retransmissor das salas online do Truco (modo WordPress).
 *
 * O navegador do anfitrião comanda a partida; este arquivo apenas guarda e
 * entrega as mensagens entre o anfitrião e os convidados.
 *
 * Ações (POST com JSON):
 *  - criar:   cria uma sala e devolve { codigo, segredo } (segredo = chave do anfitrião)
 *  - enviar:  convidado -> anfitrião ({ codigo, token, dados })
 *             anfitrião -> convidados ({ codigo, segredo, mensagens: [{ para, dados }] })
 *  - receber: mensagens novas a partir de "desde" (anfitrião usa o segredo)
 */

define('SHORTINIT', true);
require dirname(__DIR__, 3) . '/wp-load.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');

const TRUCO_LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const TRUCO_VALIDADE = 6 * 3600;
const TRUCO_MAX_DADOS = 65536;

function truco_responder($dados, $status = 200)
{
    http_response_code($status);
    echo json_encode($dados, JSON_UNESCAPED_UNICODE);
    exit;
}

function truco_texto($valor, $max)
{
    return substr(preg_replace('/[^A-Za-z0-9_\-]/', '', (string) $valor), 0, $max);
}

function truco_tabelas()
{
    global $wpdb;
    $charset = $wpdb->get_charset_collate();
    $wpdb->query("CREATE TABLE IF NOT EXISTS {$wpdb->prefix}truco_salas (
        codigo CHAR(4) NOT NULL,
        segredo CHAR(32) NOT NULL,
        criado INT UNSIGNED NOT NULL,
        PRIMARY KEY (codigo)
    ) $charset");
    $wpdb->query("CREATE TABLE IF NOT EXISTS {$wpdb->prefix}truco_msgs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        sala CHAR(4) NOT NULL,
        destino VARCHAR(64) NOT NULL,
        dados MEDIUMTEXT NOT NULL,
        criado INT UNSIGNED NOT NULL,
        PRIMARY KEY (id),
        KEY sala_destino (sala, destino, id),
        KEY criado (criado)
    ) $charset");
}

function truco_sala($codigo)
{
    global $wpdb;
    return $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}truco_salas WHERE codigo = %s", $codigo));
}

function truco_inserir($sala, $destino, $dados)
{
    global $wpdb;
    $json = json_encode($dados, JSON_UNESCAPED_UNICODE);
    if ($json === false || strlen($json) > TRUCO_MAX_DADOS) {
        return false;
    }
    return $wpdb->insert($wpdb->prefix . 'truco_msgs', [
        'sala' => $sala,
        'destino' => $destino,
        'dados' => $json,
        'criado' => time(),
    ], ['%s', '%s', '%s', '%d']);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    truco_responder(['ok' => false, 'erro' => 'Use POST'], 405);
}

$corpo = json_decode(file_get_contents('php://input'), true);
if (!is_array($corpo)) {
    truco_responder(['ok' => false, 'erro' => 'Requisição inválida'], 400);
}

global $wpdb;
$acao = $corpo['acao'] ?? '';

if ($acao === 'criar') {
    truco_tabelas();
    $limite = time() - TRUCO_VALIDADE;
    $wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->prefix}truco_msgs WHERE criado < %d", $limite));
    $wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->prefix}truco_salas WHERE criado < %d", $limite));
    $segredo = bin2hex(random_bytes(16));
    for ($tentativa = 0; $tentativa < 20; $tentativa++) {
        $codigo = '';
        for ($i = 0; $i < 4; $i++) {
            $codigo .= TRUCO_LETRAS[random_int(0, strlen(TRUCO_LETRAS) - 1)];
        }
        $ok = $wpdb->insert($wpdb->prefix . 'truco_salas', [
            'codigo' => $codigo,
            'segredo' => $segredo,
            'criado' => time(),
        ], ['%s', '%s', '%d']);
        if ($ok) {
            truco_responder(['ok' => true, 'codigo' => $codigo, 'segredo' => $segredo]);
        }
    }
    truco_responder(['ok' => false, 'erro' => 'Não foi possível criar a sala'], 500);
}

$codigo = strtoupper(truco_texto($corpo['codigo'] ?? '', 4));
$sala = $codigo ? truco_sala($codigo) : null;
if (!$sala) {
    truco_responder(['ok' => false, 'erro' => 'Sala não encontrada'], 404);
}
$ehHost = isset($corpo['segredo']) && hash_equals($sala->segredo, (string) $corpo['segredo']);
$token = truco_texto($corpo['token'] ?? '', 64);

if ($acao === 'enviar') {
    if ($ehHost) {
        $mensagens = is_array($corpo['mensagens'] ?? null) ? array_slice($corpo['mensagens'], 0, 200) : [];
        foreach ($mensagens as $m) {
            $para = ($m['para'] ?? '') === '*' ? '*' : truco_texto($m['para'] ?? '', 64);
            if ($para === '' || $para === 'host' || !array_key_exists('dados', $m)) {
                continue;
            }
            truco_inserir($codigo, $para, $m['dados']);
        }
        truco_responder(['ok' => true]);
    }
    if ($token === '' || !array_key_exists('dados', $corpo)) {
        truco_responder(['ok' => false, 'erro' => 'Mensagem inválida'], 400);
    }
    // O remetente é sempre definido pelo servidor
    $ok = truco_inserir($codigo, 'host', ['de' => $token, 'msg' => $corpo['dados']]);
    truco_responder(['ok' => (bool) $ok]);
}

if ($acao === 'receber') {
    $desde = max(0, (int) ($corpo['desde'] ?? 0));
    if ($ehHost) {
        $linhas = $wpdb->get_results($wpdb->prepare(
            "SELECT id, dados FROM {$wpdb->prefix}truco_msgs WHERE sala = %s AND destino = 'host' AND id > %d ORDER BY id LIMIT 300",
            $codigo, $desde
        ));
    } else {
        if ($token === '') {
            truco_responder(['ok' => false, 'erro' => 'Identificação inválida'], 400);
        }
        $linhas = $wpdb->get_results($wpdb->prepare(
            "SELECT id, dados FROM {$wpdb->prefix}truco_msgs WHERE sala = %s AND destino IN (%s, '*') AND id > %d ORDER BY id LIMIT 300",
            $codigo, $token, $desde
        ));
    }
    $msgs = [];
    $ultimo = $desde;
    foreach ($linhas as $l) {
        $msgs[] = json_decode($l->dados, true);
        $ultimo = (int) $l->id;
    }
    // Na primeira leitura, o convidado só quer saber a posição atual da fila
    if (!empty($corpo['inicio']) && !$ehHost) {
        $ultimo = (int) $wpdb->get_var("SELECT COALESCE(MAX(id), 0) FROM {$wpdb->prefix}truco_msgs");
        $msgs = [];
    }
    truco_responder(['ok' => true, 'msgs' => $msgs, 'ultimo' => $ultimo]);
}

truco_responder(['ok' => false, 'erro' => 'Ação desconhecida'], 400);
