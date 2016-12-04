import React from 'react';
import { graphql, compose } from 'react-apollo';
import gql from 'graphql-tag';
import moment from 'moment';
import update from 'react-addons-update';
import Header from '../components/Header';
import Blurbs from '../components/Blurbs';
import EditionNotFound from '../components/EditionNotFound';
import AddBlurbButton from '../components/AddBlurbButton';

const defaultDataForBlurbType = (blurbType) => {
  switch (blurbType) {
    case 'title':
      return { text: 'Title' };
    case 'paragraph':
      return { text: 'Paragraph' };
    case 'unsubscribe':
      return { href: '' };
    case 'header':
      return { img: { src: 'https://cdn.sparkthecause.com/daily/images/email_header_white.png' } };
    case 'share':
      return { sms: { img: { src: '' }, href: '' }, email: { img: { src: '' }, href: '' } };
    default:
      return null;
  }
};

class Edition extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isAddingBlurb: false,
      selectedBlurbType: ''
    };
  }

  approveEdition = () => {
    const { approveEdition, data: { edition: { id } } } = this.props;
    approveEdition(id);
  }

  createEdition = () => {
    const { createEdition, params: { publishDate } } = this.props;
    const defaultCssHref = 'https://s3.amazonaws.com/cdn.sparkthecause.com/daily/styles/email.css';
    createEdition(publishDate, defaultCssHref);
  }

  addBlurb = () => {
    this.setState({
      isAddingBlurb: true
    });
  }

  blurbTypeSelected = (event) => {
    const selectedBlurbType = event.target.value;
    this.setState({ selectedBlurbType });
    if (selectedBlurbType) {
      const { createBlurb, data: { edition: { id } } } = this.props;
      const defaultData = defaultDataForBlurbType(selectedBlurbType);
      console.log(id, selectedBlurbType, defaultData);
      createBlurb(id, selectedBlurbType, defaultData);
      this.setState({
        isAddingBlurb: false,
        selectedBlurbType: ''
      });
    }
  }

  createBlurb = () => {

  }

  showInfoPanel = () => {
    alert("info");
  }

  render() {
    const { data: { loading, edition, error }, params: { publishDate } } = this.props;

    const nextDate = moment(publishDate).add(1, 'day').format('YYYY-MM-DD');
    const previousDate = moment(publishDate).subtract(1, 'day').format('YYYY-MM-DD');
    const formattedPublishDate = moment(publishDate).format('ddd, MMM D');

    if (loading) {

      return(
        <div>
          <Header
            onInfo={this.showInfoPanel}
            nextDate={nextDate}
            previousDate={previousDate}
            publishDate={formattedPublishDate} />
          <span> loading... </span>
        </div>
      );

    } else if (error) {

      return(
        <div>
          <Header
            onInfo={this.showInfoPanel}
            nextDate={nextDate}
            previousDate={previousDate}
            publishDate={formattedPublishDate} />
          <span> ERROR </span>
        </div>
      );

    } else if (!edition) {

      return(
        <div>
          <Header
            onInfo={this.showInfoPanel}
            nextDate={nextDate}
            previousDate={previousDate}
            publishDate={formattedPublishDate} />
          <EditionNotFound
            createEdition={this.createEdition} />
          </div>
      );

    }

    return(
      <div>
        <link
          rel="stylesheet"
          type="text/css"
          href={edition.cssHref} />
        <Header
          isApproved={Boolean(edition.approvedAt)}
          onApprove={this.approveEdition}
          onInfo={this.showInfoPanel}
          nextDate={nextDate}
          previousDate={previousDate}
          publishDate={formattedPublishDate} />
        <Blurbs
          blurbs={edition.blurbs} />
        <AddBlurbButton
          isAddingBlurb={this.state.isAddingBlurb}
          onAddBlurb={this.addBlurb}
          onBlurbTypeSelected={this.blurbTypeSelected}
          selectedBlurbType={this.state.selectedBlurbType} />
      </div>
    );

  }

};

Edition.propTypes = {
  approveEdition: React.PropTypes.func.isRequired,
  createBlurb: React.PropTypes.func.isRequired,
  createEdition: React.PropTypes.func.isRequired,
  data: React.PropTypes.shape({
    loading: React.PropTypes.bool,
    edition: React.PropTypes.object,
  }).isRequired
};

const APPROVE_EDITION_MUTATION = gql`
  mutation approveEdition($editionId: ID!) {
    approveEdition(id: $editionId) {
      id
      approvedAt
    }
  }`;

const CREATE_EDITION_MUTATION = gql`
  mutation createEdition($publishDate: Date!, $cssHref: String) {
    createEdition(publishDate: $publishDate, cssHref: $cssHref) {
      id
      approvedAt
      publishOn (format: "YYYY-MM-DD")
      cssHref
      blurbs {
        id
        type
        data
      }
    }
  }`;

const CREATE_BLURB_MUTATION = gql`
  mutation createBlurb($type: String!, $editionId: ID, $data: JSON) {
    createBlurb(type: $type, editionId: $editionId, data: $data) {
      id
      type
      data
    }
  }`;

const EDITION_QUERY = gql`
  query currentEdition($publishDate: Date!) {
    edition(publishDate: $publishDate) {
      id
      approvedAt
      publishOn (format: "YYYY-MM-DD")
      cssHref
      blurbs {
        id
        type
        data
      }
    }
  }`;

export default compose(
  graphql(EDITION_QUERY, {
    options: ({ params: { publishDate } }) => ({
      variables: { publishDate }
    })
  }),
  graphql(APPROVE_EDITION_MUTATION, {
    props: ({ mutate }) => ({
      approveEdition: (editionId) => mutate({
        variables: { editionId }
      })
    })
  }),
  graphql(CREATE_EDITION_MUTATION, {
    props: ({ mutate }) => ({
      createEdition: (publishDate, cssHref) => mutate({
        variables: { publishDate, cssHref },
        updateQueries: {
          currentEdition: (prev, { mutationResult }) => {
            const newEdition = mutationResult.data.createEdition;
            return update(prev, {
              edition: {
                $set: newEdition
              }
            });
          }
        }
      })
    })
  }),
  graphql(CREATE_BLURB_MUTATION, {
    props: ({ mutate }) => ({
      createBlurb: (editionId, type, data) => mutate({
        variables: { editionId, type, data },
        updateQueries: {
          currentEdition: (prev, { mutationResult }) => {
            const newBlurb = mutationResult.data.createBlurb;
            return update(prev, {
              edition: {
                blurbs: {
                  $unshift: [newBlurb]
                }
              }
            });
          }
        }
      })
    })
  })
)(Edition);
