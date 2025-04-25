import React from 'react';
import { Box, Grid, Card, CardContent, Typography, Button } from '@mui/material';

const StoryEditor = () => {
  // Mock data for demonstration purposes
  const storyArcs = [
    {
      id: 1,
      title: "Story Arc 1",
      seasons: [
        {
          id: 1,
          title: "Season 1",
          episodes: [
            { id: 1, title: "Episode 1", description: "Description of Episode 1" },
            { id: 2, title: "Episode 2", description: "Description of Episode 2" },
          ],
        },
      ],
    },
  ]; 


  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Story Arcs
      </Typography>
      <Grid container spacing={3}>
        {storyArcs.map((arc) => (
          <Grid item xs={12} key={arc.id}>
            <Card>
              <CardContent>
                <Typography variant="h5">{arc.title}</Typography>
                <Grid container spacing={2}>
                  {arc.seasons.map((season) => (
                    <Grid item xs={12} sm={6} key={season.id}>
                      <Card sx={{ backgroundColor: "#f5f5f5" }}>
                        <CardContent>
                          <Typography variant="h6">{season.title}</Typography>
                          <Grid container spacing={1}>
                            {season.episodes.map((episode) => (
                              <Grid item xs={12} key={episode.id}>
                                <Card>
                                  <CardContent>
                                    <Typography variant="subtitle1">
                                      {episode.title}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                      {episode.description}
                                    </Typography>
                                  </CardContent>
                                </Card>
                              </Grid>
                            ))}
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Box sx={{ marginTop: 3 }}>
        <Button variant="contained" color="primary">
          Add Story Arc
        </Button>
      </Box>
    </Box>
  );
};

export default StoryEditor;