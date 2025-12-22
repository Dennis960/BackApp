import {
  Card,
  CardContent,
  Grid,
  Paper,
  Typography,
} from '@mui/material';

function PlaceholderInfo() {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ bgcolor: 'info.lighter' }}>
        <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
          Available Placeholders
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2" fontWeight="bold" fontFamily="monospace" color="info.main">
                {'{date}'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Current date (YYYY-MM-DD)
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2" fontWeight="bold" fontFamily="monospace" color="info.main">
                {'{time}'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Current time (HH-MM-SS)
              </Typography>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="body2" fontWeight="bold" fontFamily="monospace" color="info.main">
                {'{profile}'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Profile name
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

export default PlaceholderInfo;
