import AppBar from '@mui/material/AppBar';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import App from './App';
import { VideocamOutlined } from '@mui/icons-material';
import { Container } from '@mui/material';

function Copyright() {
    return (
        <Typography variant="body2" color="text.secondary" align="center">
            {'Copyright © '}
            <Link color="inherit" href="https://mui.com/">
                Your Website
            </Link>{' '}
            {new Date().getFullYear()}
            {'.'}
        </Typography>
    );
}

const theme = createTheme({
    palette: {
        mode: 'dark',
    },
});

export default function Home() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <AppBar>
                <Toolbar>
                    <VideocamOutlined sx={{ mr: 2 }} />
                    <Typography variant="h6" color="inherit" noWrap>
                        Web Video Editor
                    </Typography>
                </Toolbar>
            </AppBar>
            <main>
                <Container fixed>
                    <App />
                </Container>
            </main>
            {/* Footer */}
            <Box sx={{ bgcolor: 'background.paper', p: 6 }} component="footer">
                <Typography
                    variant="subtitle1"
                    align="center"
                    color="text.secondary"
                    component="p"
                >
                    Something here to give the footer a purpose!
                </Typography>
                <Copyright />
            </Box>
            {/* End footer */}
        </ThemeProvider>
    );
}