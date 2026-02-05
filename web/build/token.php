<?php
/**
 * token.php - ExoEngine Secure Token Exchange
 * Handles Bungie.net OAuth token exchange and refresh securely.
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://exoengine.online');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$clientId = '51502';
$clientSecret = 'hC45kxmr4kENUa0UCQpLuS0WdNz-V0B-0u8kHcVblb8';
$apiKey = 'cfada238bccc49dca0c61b18c276e466';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw_input = file_get_contents('php://input');
    $json_input = json_decode($raw_input, true);
    $input = !empty($json_input) ? $json_input : $_POST;

    $grantType = $input['grant_type'] ?? 'authorization_code';
    
    $postFields = [
        'client_id' => $clientId,
        'client_secret' => $clientSecret,
        'grant_type' => $grantType,
    ];

    if ($grantType === 'authorization_code') {
        $postFields['code'] = $input['code'] ?? '';
        $postFields['redirect_uri'] = 'https://exoengine.online/auth/callback';
    } else if ($grantType === 'refresh_token') {
        $postFields['refresh_token'] = $input['refresh_token'] ?? '';
    }

    $ch = curl_init('https://www.bungie.net/Platform/App/OAuth/Token/');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postFields));
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4); // Force IPv4
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'X-API-Key: ' . $apiKey,
        'Content-Type: application/x-www-form-urlencoded',
        'User-Agent: ExoEngine/1.0 AppId/51502 (+https://exoengine.online)'
    ]);

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (curl_errno($ch)) {
        $error_msg = curl_error($ch);
        $error_no = curl_errno($ch);
        http_response_code(500);
        echo json_encode(['error' => "Proxy communication error ($error_no): $error_msg"]);
        curl_close($ch);
        exit;
    }

    curl_close($ch);
    http_response_code($http_code);
    echo $response;
}
