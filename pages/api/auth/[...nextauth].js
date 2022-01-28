import NextAuth from "next-auth";
import SpotifyProvider from "next-auth/providers/spotify";
import spotifyApi,{LOGIN_URL} from '../../../lib/spotify';

async function refreshAccessToken(token){
    try{
        spotifyApi.setAccessToken(token.accessToken);
        spotifyApi.setRefreshToken(token.refreshToken);

        const{ body: refreshedToken } = await spotifyApi.refreshAccessToken();
        console.log("Refreshed token is", refreshedToken);
        return{
            ...token,
            accessToken: refreshedToken.access_token,
            accessTokenExpires:Date.now + refreshedToken.expires_in * 1000,
            refreshToken: refreshedToken.refresh_token ?? token.refreshToken,
        };
    }
    catch(error){
        console.error(error);
        return{
            ...token,
            error: "RefreshAccessTokenError"
        };
    }
}

export default NextAuth({
    providers:[
        SpotifyProvider({
            clientId: process.env.NEXT_PUBLIC_CLIENT_ID,
            clientSecret: process.env.NEXT_PUBLIC_CLIENT_SECRET,
            authorization: LOGIN_URL,
        }),
    ],
    secret: process.env.JWT_SECRET,
    pages:{
        signIn: '/login'
    },
    callbacks:{
        async jwt({token, account, user}){
            //initial sign in
            if (account && user){
                return{
                    ...token,
                    accessToken: account.access_token,
                    refreshToken: account.refresh_token,
                    username: account.provideAccountId,
                    accessTokenExpires: account.expires_at * 1000,
                }
            }
            //return previous token if not expired
            if(Date.now()<token.accessTokenExpires){
                console.log("token valid");
                return token;
            }
            
            //expired so refresh
            console.log("token expired");
            return await refreshAccessToken(token)
        },
        async session ({session,token}){
            session.user.accessToken = token.accessToken;
            session.user.refreshToken = token.refreshToken;
            session.user.username = token.username;
            return session;
        }
    },
});