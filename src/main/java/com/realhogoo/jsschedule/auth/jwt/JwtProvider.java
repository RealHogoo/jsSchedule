package com.realhogoo.jsschedule.auth.jwt;

import com.auth0.jwt.JWT;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.auth0.jwt.interfaces.JWTVerifier;

public class JwtProvider {

    private final JWTVerifier verifier;

    public JwtProvider(String secret, String issuer) {
        if (secret == null || secret.trim().length() < 32 || "CHANGE_ME_TO_LONG_RANDOM_SECRET".equals(secret.trim())) {
            throw new IllegalStateException("jwt.secret must be overridden with a strong random value");
        }
        Algorithm algorithm = Algorithm.HMAC256(secret);
        this.verifier = JWT.require(algorithm)
            .withIssuer(issuer)
            .build();
    }

    public DecodedJWT verify(String token) {
        return verifier.verify(token);
    }
}
